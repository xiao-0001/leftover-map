import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '../lib/useI18n';
import { LANGUAGES } from '../i18n';

export default function Header() {
  const loc = useLocation();
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const isCvs = loc.pathname.startsWith('/cvs');

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === lang)!;

  return (
    <header className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white shadow-md z-[1100] relative">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="bg-white text-emerald-700 font-bold w-9 h-9 rounded-lg flex items-center justify-center text-lg shadow-sm">食</div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">{t('header.title')}</h1>
            <p className="text-xs text-emerald-100 leading-tight">{t('header.subtitle')}</p>
          </div>
        </div>

        <nav className="flex bg-emerald-800/40 rounded-lg p-1 text-sm">
          <NavLink
            to="/cvs"
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-md font-medium transition ${
                isActive ? 'bg-white text-emerald-700' : 'text-emerald-50 hover:bg-emerald-700/40'
              }`
            }
          >
            {t('header.mode.cvs')}
          </NavLink>
          <NavLink
            to="/dorm"
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-md font-medium transition ${
                isActive ? 'bg-white text-emerald-700' : 'text-emerald-50 hover:bg-emerald-700/40'
              }`
            }
          >
            {t('header.mode.dorm')}
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald-100 hidden md:inline">
            {isCvs ? t('header.tagline.cvs') : t('header.tagline.dorm')}
          </span>
          <div ref={ref} className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="bg-emerald-800/40 hover:bg-emerald-800/60 rounded-md px-3 py-1.5 text-sm flex items-center gap-1.5"
              title={t('lang.select')}
            >
              <span>{current.flag}</span>
              <span className="hidden sm:inline">{current.native}</span>
              <span className="text-xs">▾</span>
            </button>
            {open && (
              <div className="absolute right-0 mt-1 bg-white text-gray-800 rounded-lg shadow-xl py-1 min-w-[160px] z-[1200]">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLang(l.code);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                      l.code === lang ? 'bg-emerald-50 font-semibold' : ''
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.native}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
