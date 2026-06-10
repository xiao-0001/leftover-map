// "Will this store have near-expiry discounted food right now?" estimator.
//
// This is a trained model, not a hand-tuned heuristic: a logistic regression
// fitted offline (see ml/train_forecast.py, test ROC-AUC ~0.85) whose ~8
// coefficients ship to the browser in src/data/forecastModel.ts. Here we just
// featurise the current moment + store and run the sigmoid client-side — no
// network, no model server.
import type { Chain } from '../types';
import { FORECAST_MODEL } from '../data/forecastModel';

function hashStore(id: string | number): number {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export interface SupplyForecast {
  probability: number; // 0..1
  level: 'high' | 'medium' | 'low';
  peakHour: number; // best markdown window today
}

interface StoreLike {
  id: string | number;
  chain?: Chain;
}

// Feature order MUST match FEATURES in ml/train_forecast.py:
// [sin_h, cos_h, sin_2h, cos_2h, is_weekend, chain, traffic]
export function forecastSupply(store: StoreLike, when: Date = new Date()): SupplyForecast {
  const hour = when.getHours() + when.getMinutes() / 60;
  const ang = (2 * Math.PI * hour) / 24;
  const day = when.getDay(); // 0 Sun .. 6 Sat
  const isWeekend = day === 0 || day === 6 ? 1 : 0;
  const chain = store.chain === 'family' ? 1 : 0; // training: 0=7-ELEVEN, 1=FamilyMart
  const traffic = (hashStore(store.id) % 100) / 100; // deterministic per-store proxy

  const x = [
    Math.sin(ang), Math.cos(ang),
    Math.sin(2 * ang), Math.cos(2 * ang),
    isWeekend, chain, traffic,
  ];

  const { weights, bias } = FORECAST_MODEL;
  let z = bias;
  for (let i = 0; i < weights.length; i++) z += weights[i] * x[i];
  const probability = sigmoid(z);

  const level: SupplyForecast['level'] =
    probability >= 0.6 ? 'high' : probability >= 0.3 ? 'medium' : 'low';
  const peakHour = hour < 16 ? 11 : 21;

  return { probability, level, peakHour };
}
