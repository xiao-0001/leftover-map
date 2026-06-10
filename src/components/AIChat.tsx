import { useState, useRef, useEffect } from 'react';
import { askAgent } from '../lib/api';
import { useI18n } from '../lib/useI18n';

interface Msg {
  role: 'user' | 'ai';
  text: string;
}

export default function AIChat({ onReserved }: { onReserved?: () => void }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setInput('');
    const next: Msg[] = [...msgs, { role: 'user', text: q }];
    setMsgs(next);
    setLoading(true);
    try {
      const history = next.map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));
      const { answer, reserved } = await askAgent(history, lang);
      setMsgs((m) => [...m, { role: 'ai', text: answer }]);
      if (reserved && onReserved) onReserved();
    } catch {
      setMsgs((m) => [...m, { role: 'ai', text: t('ai.chat.error') }]);
    } finally {
      setLoading(false);
    }
  }

  const examples = [t('ai.chat.example1'), t('ai.chat.example2')];

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="absolute bottom-[5.5rem] right-4 z-[1100] bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl w-14 h-14 flex items-center justify-center text-2xl hover:scale-105 transition-transform"
        title={t('ai.fab')}
        aria-label={t('ai.fab')}
      >
        {open ? '✕' : '✨'}
      </button>

      {open && (
        <div className="absolute bottom-[10rem] right-4 z-[1100] w-[92vw] max-w-sm h-[28rem] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white px-4 py-3">
            <div className="font-semibold flex items-center gap-2">✨ {t('ai.chat.title')}</div>
            <div className="text-xs text-emerald-100">{t('ai.chat.subtitle')}</div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {msgs.length === 0 && (
              <div className="text-sm text-gray-500 space-y-3">
                <p>{t('ai.chat.intro')}</p>
                <div className="flex flex-col gap-1.5">
                  {examples.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => send(ex)}
                      className="text-left text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-emerald-400 hover:bg-emerald-50 transition"
                    >
                      💬 {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 text-gray-500 rounded-2xl rounded-bl-sm px-3 py-2 text-sm">
                  {t('ai.chat.thinking')}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t p-2 flex gap-2 items-center bg-white"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('ai.chat.placeholder')}
              maxLength={500}
              className="flex-1 border rounded-full px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-emerald-600 text-white rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-40 hover:bg-emerald-700 shrink-0"
              aria-label={t('ai.chat.send')}
            >
              ➤
            </button>
          </form>
          <div className="px-3 pb-2 text-[10px] text-gray-400 bg-white text-center">
            {t('ai.chat.disclaimer')}
          </div>
        </div>
      )}
    </>
  );
}
