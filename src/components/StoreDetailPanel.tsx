import { useState, useMemo } from 'react';
import type { Store } from '../types';
import { generateMockItems, categoryEmoji } from '../lib/mockCvsFood';
import { forecastSupply } from '../lib/supplyForecast';
import { CHAIN_META } from '../data/cvs';
import { useI18n } from '../lib/useI18n';

interface Props {
  store: Store;
  onClose: () => void;
}

function formatTimeLeft(iso: string, t: (k: string, p?: Record<string, string | number>) => string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return t('cvs.expired');
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  if (h > 0) return t('cvs.expiresIn.h', { h, m });
  return t('cvs.expiresIn.m', { m });
}

export default function StoreDetailPanel({ store, onClose }: Props) {
  const { t, lang } = useI18n();
  const items = useMemo(() => generateMockItems(store.id, lang), [store.id, lang]);
  const forecast = useMemo(() => forecastSupply(store), [store]);
  const [reserved, setReserved] = useState<Set<number>>(new Set());

  const meta = CHAIN_META[store.chain];
  const fc = forecast;
  const fcColor = fc.level === 'high' ? '#10b981' : fc.level === 'medium' ? '#f59e0b' : '#9ca3af';
  const fcPct = Math.round(fc.probability * 100);
  const totalSavings = items.reduce((sum, it) => sum + (it.original - it.discount) * it.qty, 0);

  return (
    <div className="absolute right-0 top-0 bottom-0 w-full md:w-[420px] bg-white shadow-2xl z-[1050] flex flex-col">
      <div className="p-4 border-b flex items-start justify-between" style={{ background: meta.color, color: 'white' }}>
        <div>
          <div className="text-xs opacity-90">{meta.label}</div>
          <h2 className="text-lg font-bold">{store.name}</h2>
          <p className="text-xs opacity-90 mt-1">📍 {store.address}</p>
          {store.tel && <p className="text-xs opacity-90">☎ {store.tel}</p>}
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none ml-2" aria-label="close">×</button>
      </div>

      <div className="px-4 py-3 bg-emerald-50 border-b text-sm flex items-center justify-between">
        <span className="text-emerald-800">{t('cvs.todayLeftover')} · {items.length} {t('cvs.itemsAvailable')}</span>
        <span className="text-emerald-700 font-semibold">{t('cvs.save', { amount: totalSavings })}</span>
      </div>

      <div className="px-4 py-3 border-b bg-white">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-gray-700 font-medium">🔮 {t('cvs.forecast.label')}</span>
          <span className="font-bold" style={{ color: fcColor }}>
            {fcPct}% · {t(`cvs.forecast.level.${fc.level}`)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${fcPct}%`, background: fcColor }} />
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">
          {t('cvs.forecast.peak', { time: `${fc.peakHour}:00` })} · {t('cvs.forecast.note')}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.map((it, i) => {
          const isReserved = reserved.has(i);
          return (
            <div key={i} className={`border rounded-lg p-3 ${isReserved ? 'bg-gray-50 opacity-70' : 'bg-white'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl">{categoryEmoji(it.category)}</span>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{it.title}</div>
                    <div className="text-xs text-gray-500">
                      {formatTimeLeft(it.expires, t)} · {t('cvs.qty', { n: it.qty })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-600">NT$ {it.discount}</div>
                  <div className="text-xs text-gray-400 line-through">NT$ {it.original}</div>
                </div>
              </div>
              <button
                disabled={isReserved}
                onClick={() => setReserved((prev) => new Set(prev).add(i))}
                className={`mt-2 w-full py-1.5 rounded text-sm font-medium transition ${
                  isReserved ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {isReserved ? t('cvs.reserved') : t('cvs.reserve')}
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-t p-3 text-xs text-gray-500 bg-gray-50">{t('cvs.disclaimer')}</div>
    </div>
  );
}
