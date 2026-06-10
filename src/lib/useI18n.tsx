import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { messages, format, type Lang } from '../i18n';

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

function fromNav(): Lang {
  const nav = (navigator.language || 'en').toLowerCase();
  if (nav.startsWith('zh')) return 'zh';
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('ko')) return 'ko';
  if (nav.startsWith('hi')) return 'hi';
  if (nav.startsWith('vi')) return 'vi';
  if (nav.startsWith('th')) return 'th';
  if (nav.startsWith('de')) return 'de';
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('fr')) return 'fr';
  return 'zh'; // default to Chinese (primary audience: NYCU/NTHU in Taiwan)
}

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem('lang') as Lang | null;
    if (saved && saved in messages) return saved;
  } catch {
    /* Safari private mode / cookies blocked — fall through */
  }
  return fromNav();
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem('lang', l);
    } catch {
      /* storage blocked — selection still works for this session */
    }
    setLangState(l);
    document.documentElement.lang = l === 'zh' ? 'zh-TW' : l;
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const tpl = messages[lang]?.[key] ?? messages.en[key] ?? messages.zh[key] ?? key;
      return format(tpl, params);
    },
    [lang],
  );

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be used inside <I18nProvider>');
  return v;
}
