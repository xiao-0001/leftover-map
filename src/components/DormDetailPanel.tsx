import { useEffect, useState, useCallback } from 'react';
import type { Dorm, LeftoverItem } from '../types';
import { listItems } from '../lib/api';
import { categoryById } from '../data/categories';
import NewItemDialog from './NewItemDialog';
import ClaimDialog from './ClaimDialog';
import ItemText from './ItemText';
import { useI18n } from '../lib/useI18n';

interface Props {
  dorm: Dorm;
  onClose: () => void;
  onChange: () => void;
}

function timeUntil(iso: string, t: (k: string, p?: Record<string, string | number>) => string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return t('dorm.timeLeft.expired');
  const h = Math.floor(ms / 3600_000);
  if (h >= 24) return t('dorm.timeLeft.day', { n: Math.floor(h / 24) });
  if (h > 0) return t('dorm.timeLeft.hour', { n: h });
  return t('dorm.timeLeft.min', { n: Math.floor(ms / 60_000) });
}

export default function DormDetailPanel({ dorm, onClose, onChange }: Props) {
  const { t } = useI18n();
  const [items, setItems] = useState<LeftoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [claimTarget, setClaimTarget] = useState<LeftoverItem | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listItems(dorm.id);
      setItems(res);
    } finally {
      setLoading(false);
    }
  }, [dorm.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleClaimed(claimed: LeftoverItem) {
    setRevealed((prev) => new Set(prev).add(claimed.id));
    setClaimTarget(null);
    refresh();
    onChange();
  }

  const available = items.filter((i) => !i.claimed);
  const claimed = items.filter((i) => !!i.claimed);
  const schoolLabel = dorm.school === 'NYCU' ? t('dorm.nycu') : t('dorm.nthu');

  return (
    <div className="absolute right-0 top-0 bottom-0 w-full md:w-[440px] bg-white shadow-2xl z-[1050] flex flex-col">
      <div className={`p-4 border-b text-white flex items-start justify-between ${dorm.school === 'NYCU' ? 'bg-blue-700' : 'bg-orange-800'}`}>
        <div>
          <div className="text-xs opacity-90">{schoolLabel}</div>
          <h2 className="text-lg font-bold">{dorm.name}</h2>
          <p className="text-xs opacity-90 mt-1">📍 {dorm.lat.toFixed(5)}, {dorm.lng.toFixed(5)}</p>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none ml-2" aria-label="close">×</button>
      </div>

      <div className="px-4 py-3 border-b flex items-center justify-between">
        <span className="text-sm text-gray-700">
          {loading ? t('dorm.loading') : t('dorm.summary', { available: available.length, claimed: claimed.length })}
        </span>
        <button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-700"
        >
          {t('dorm.addItem')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!loading && available.length === 0 && claimed.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-2">📭</div>
            <p>{t('dorm.empty.title')}</p>
            <p className="text-xs mt-1">{t('dorm.empty.subtitle')}</p>
          </div>
        )}

        {available.map((it) => {
          const cat = categoryById(it.category);
          return (
            <div key={it.id} className="border rounded-lg p-3 bg-white hover:border-emerald-300 transition">
              <div className="flex gap-3">
                {it.image_data_url && (
                  <img
                    src={it.image_data_url}
                    alt={it.title}
                    className="w-20 h-20 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    {cat && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded text-white"
                        style={{ background: cat.color }}
                      >
                        {cat.emoji} {t(`category.${cat.id}`)}
                      </span>
                    )}
                  </div>
                  <ItemText title={it.title} description={it.description} />
                  <div className="text-xs text-gray-500 mt-1">⏰ {timeUntil(it.expires_at, t)}</div>
                </div>
              </div>
              {revealed.has(it.id) ? (
                <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5 text-sm">
                  {t('dorm.contact')}：<b className="font-mono">{it.contact}</b>
                </div>
              ) : (
                <button
                  onClick={() => setClaimTarget(it)}
                  className="mt-2 w-full py-1.5 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                >
                  {t('dorm.want')}
                </button>
              )}
            </div>
          );
        })}

        {claimed.length > 0 && (
          <details className="pt-2" open>
            <summary className="text-xs text-gray-500 cursor-pointer select-none">{t('dorm.claimed.section', { n: claimed.length })}</summary>
            <div className="mt-2 space-y-1.5">
              {claimed.map((it) => {
                const cat = categoryById(it.category);
                return (
                  <div key={it.id} className="border rounded-lg p-2.5 text-sm bg-gray-50">
                    <div className="flex gap-2.5 items-start">
                      {it.image_data_url && (
                        <img
                          src={it.image_data_url}
                          alt={it.title}
                          className="w-12 h-12 rounded object-cover bg-gray-200 flex-shrink-0 opacity-70"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {cat && (
                            <span className="text-[9px] font-medium px-1 py-0.5 rounded text-white opacity-70" style={{ background: cat.color }}>
                              {cat.emoji}
                            </span>
                          )}
                          <span className="font-medium text-gray-700 line-through">{it.title}</span>
                        </div>
                        {it.claimer_name && (
                          <div className="mt-1 text-xs text-gray-700">
                            👤 {t('dorm.claimedBy', { name: it.claimer_name })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>

      {showForm && (
        <NewItemDialog
          dorm={dorm}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            refresh();
            onChange();
          }}
        />
      )}

      {claimTarget && (
        <ClaimDialog
          item={claimTarget}
          onClose={() => setClaimTarget(null)}
          onClaimed={handleClaimed}
        />
      )}
    </div>
  );
}
