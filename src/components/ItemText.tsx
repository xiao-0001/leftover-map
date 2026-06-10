import { useState } from 'react';
import { translateTexts } from '../lib/api';
import { useI18n } from '../lib/useI18n';

// Renders an item's title + description with a one-tap "translate to my language"
// affordance. Translation is on-demand (we don't auto-translate every card to
// avoid hammering the model); once fetched, the user can toggle back to the
// original.
export default function ItemText({ title, description }: { title: string; description?: string | null }) {
  const { t, lang } = useI18n();
  const [tr, setTr] = useState<{ title: string; description: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run() {
    if (tr) {
      setShowOriginal((s) => !s);
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const [tTitle, tDesc] = await translateTexts([title, description ?? ''], lang);
      setTr({ title: tTitle, description: tDesc ?? '' });
      setShowOriginal(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const showTr = tr && !showOriginal;
  const shownTitle = showTr ? tr!.title : title;
  const shownDesc = showTr ? tr!.description : description;

  return (
    <>
      <div className="font-semibold text-gray-900">{shownTitle}</div>
      {shownDesc && <div className="text-sm text-gray-600 mt-0.5">{shownDesc}</div>}
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="mt-1 text-[11px] text-sky-600 hover:text-sky-800 disabled:opacity-50"
      >
        {busy
          ? `⏳ ${t('ai.translate.loading')}`
          : failed
            ? `⚠️ ${t('ai.translate.error')}`
            : tr
              ? showOriginal
                ? `🌐 ${t('ai.translate.showTranslation')}`
                : `🌐 ${t('ai.translate.showOriginal')}`
              : `🌐 ${t('ai.translate.btn')}`}
      </button>
    </>
  );
}
