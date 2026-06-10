import { useState } from 'react';
import type { LeftoverItem } from '../types';
import { claimItem } from '../lib/api';
import { useI18n } from '../lib/useI18n';

interface Props {
  item: LeftoverItem;
  onClose: () => void;
  onClaimed: (claimed: LeftoverItem) => void;
}

export default function ClaimDialog({ item, onClose, onClaimed }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr(t('dialog.claim.error.required'));
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const result = await claimItem(item.id, {
        claimer_name: name.trim(),
        claimer_contact: contact.trim() || undefined,
      });
      onClaimed(result);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="absolute inset-0 z-[1100] bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 my-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t('dialog.claim.title')}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('dialog.claim.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
            aria-label="close"
          >
            ×
          </button>
        </div>

        <div className="mb-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm">
          <div className="font-semibold text-emerald-900">{item.title}</div>
          {item.description && (
            <div className="text-xs text-emerald-800 mt-0.5">{item.description}</div>
          )}
        </div>

        <form onSubmit={submit} className="space-y-3 text-sm">
          <label className="block">
            <span className="text-gray-700 font-medium">{t('dialog.claim.name')}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('dialog.claim.name.placeholder')}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              maxLength={30}
              autoFocus
            />
          </label>

          <label className="block">
            <span className="text-gray-700 font-medium">{t('dialog.claim.contact')}</span>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t('dialog.claim.contact.placeholder')}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              maxLength={100}
            />
            <span className="block mt-1 text-[11px] text-gray-500">{t('dialog.claim.contact.hint')}</span>
          </label>

          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">
              {err}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
            >
              {t('dialog.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 font-medium"
            >
              {submitting ? t('dialog.claim.submitting') : t('dialog.claim.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
