import { useState, useRef } from 'react';
import type { Dorm } from '../types';
import { createItem, recognizeImage } from '../lib/api';
import { CATEGORIES, type CategoryId } from '../data/categories';
import { compressImage, ImageError } from '../lib/imageCompress';
import { useI18n } from '../lib/useI18n';

interface Props {
  dorm: Dorm;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewItemDialog({ dorm, onClose, onCreated }: Props) {
  const { t, lang } = useI18n();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<CategoryId>('other');
  const [hours, setHours] = useState(24);
  const [contact, setContact] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isCategoryId = (s: string): s is CategoryId => CATEGORIES.some((c) => c.id === s);

  async function runAI() {
    if (!imageDataUrl || aiBusy) return;
    setAiBusy(true);
    setAiNote(null);
    setErr(null);
    try {
      const r = await recognizeImage(imageDataUrl, lang);
      if (r.title) setTitle(r.title.slice(0, 80));
      if (r.category && isCategoryId(r.category)) setCategory(r.category);
      setAiNote(t('ai.vision.done'));
    } catch {
      setAiNote(t('ai.vision.error'));
    } finally {
      setAiBusy(false);
    }
  }

  async function handleFile(f: File | undefined) {
    if (!f) return;
    setCompressing(true);
    setErr(null);
    try {
      const url = await compressImage(f);
      setImageDataUrl(url);
    } catch (e) {
      if (e instanceof ImageError && e.code === 'too_large') {
        setErr(t('dialog.field.image.tooLarge'));
      } else {
        setErr((e as Error).message || 'image error');
      }
    } finally {
      setCompressing(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !contact.trim()) {
      setErr(t('dialog.error.required'));
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const expires_at = new Date(Date.now() + hours * 3600_000).toISOString();
      await createItem({
        dorm_id: dorm.id,
        title: title.trim(),
        description: desc.trim() || undefined,
        category,
        image_data_url: imageDataUrl ?? undefined,
        expires_at,
        contact: contact.trim(),
      });
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-[1100] bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 my-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t('dialog.title')}</h3>
            <p className="text-xs text-gray-500">{t('dialog.at', { dorm: dorm.name })}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="close">×</button>
        </div>

        <form onSubmit={submit} className="space-y-3 text-sm">
          <label className="block">
            <span className="text-gray-700 font-medium">{t('dialog.field.name')}</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('dialog.field.name.placeholder')}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              maxLength={80}
            />
          </label>

          <label className="block">
            <span className="text-gray-700 font-medium">{t('dialog.field.category')}</span>
            <div className="mt-1 grid grid-cols-4 gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded border text-[11px] leading-tight min-h-[3.25rem] break-words transition ${
                    category === c.id
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span className="text-lg">{c.emoji}</span>
                  <span className="text-center">{t(`category.${c.id}`)}</span>
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="text-gray-700 font-medium">{t('dialog.field.desc')}</span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t('dialog.field.desc.placeholder')}
              rows={2}
              className="mt-1 w-full border rounded-lg px-3 py-2 resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              maxLength={500}
            />
          </label>

          <div className="block">
            <span className="text-gray-700 font-medium">{t('dialog.field.image')}</span>
            <div className="mt-1">
              {imageDataUrl ? (
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <img src={imageDataUrl} alt={t('dialog.field.image')} className="w-20 h-20 rounded-lg object-cover border" />
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                      >
                        {t('dialog.field.image.change')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setImageDataUrl(null); setAiNote(null); }}
                        className="text-xs px-2 py-1 rounded border hover:bg-gray-50 text-red-600"
                      >
                        {t('dialog.field.image.remove')}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={runAI}
                    disabled={aiBusy}
                    className="w-full py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 disabled:opacity-60 transition flex items-center justify-center gap-1.5"
                  >
                    {aiBusy ? `⏳ ${t('ai.vision.loading')}` : `✨ ${t('ai.vision.btn')}`}
                  </button>
                  {aiNote && <p className="text-xs text-emerald-600">{aiNote}</p>}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={compressing}
                  className="w-full py-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition text-gray-600 disabled:opacity-50"
                >
                  {compressing ? `⏳ ${t('dialog.field.image.compressing')}` : `📷 ${t('dialog.field.image.choose')}`}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          </div>

          <label className="block">
            <span className="text-gray-700 font-medium">{t('dialog.field.expiry')}</span>
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="mt-1 w-full border rounded-lg px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value={2}>{t('dialog.expiry.2h')}</option>
              <option value={6}>{t('dialog.expiry.6h')}</option>
              <option value={12}>{t('dialog.expiry.12h')}</option>
              <option value={24}>{t('dialog.expiry.1d')}</option>
              <option value={48}>{t('dialog.expiry.2d')}</option>
              <option value={72}>{t('dialog.expiry.3d')}</option>
            </select>
          </label>

          <label className="block">
            <span className="text-gray-700 font-medium">{t('dialog.field.contact')}</span>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t('dialog.field.contact.placeholder')}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              maxLength={100}
            />
          </label>

          {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{err}</div>}

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
              {submitting ? t('dialog.submitting') : t('dialog.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
