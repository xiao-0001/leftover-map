import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useI18n } from '../lib/useI18n';

const SITE_URL = 'https://leftovermap-nycu.pages.dev';

export default function QRCodeBadge() {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  return (
    <>
      <button
        onClick={() => setExpanded(true)}
        className="absolute top-3 right-3 z-[1000] bg-white rounded-lg shadow-lg p-2 flex flex-col items-center gap-1 hover:scale-105 transition-transform border border-gray-200"
        title={t('qr.tooltip')}
        aria-label={t('qr.tooltip')}
      >
        <QRCodeSVG
          value={SITE_URL}
          size={80}
          level="M"
          bgColor="#ffffff"
          fgColor="#065f46"
        />
        <span className="text-[10px] font-medium text-gray-700 leading-none">
          📱 {t('qr.label')}
        </span>
      </button>

      {expanded && (
        <div
          className="fixed inset-0 z-[2000] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpanded(false)}
              className="self-end text-gray-400 hover:text-gray-700 text-2xl leading-none -mt-2 -mr-2"
              aria-label="close"
            >
              ×
            </button>
            <h3 className="text-lg font-bold text-emerald-700 mb-1">
              {t('qr.modal.title')}
            </h3>
            <p className="text-xs text-gray-500 mb-4 text-center">
              {t('qr.modal.subtitle')}
            </p>
            <div className="bg-white p-4 rounded-xl border-2 border-emerald-100">
              <QRCodeSVG
                value={SITE_URL}
                size={280}
                level="M"
                bgColor="#ffffff"
                fgColor="#065f46"
              />
            </div>
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-sm text-emerald-700 hover:text-emerald-900 break-all text-center font-mono"
            >
              {SITE_URL}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
