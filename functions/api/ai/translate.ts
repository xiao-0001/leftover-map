// On-demand translation of user-generated item text (title / description).
// The UI chrome is already in 10 languages, but what students *type* isn't —
// so an international student can tap "translate" to read a Chinese post in
// their own language.
//
// We translate with the Llama instruct model rather than a dedicated MT model:
// for short, context-light item names ("半條法式長棍", "整盒大湖草莓") the small
// many-to-many MT model produced poor output ("Half a French style", strawberry
// -> "BBQ"), whereas the instruct model handles them well and auto-detects the
// source language.

interface AiBinding {
  run: (model: string, input: unknown) => Promise<{ response?: string } & Record<string, unknown>>;
}
interface Env {
  AI: AiBinding;
}

// 70B handles CJK translation (incl. the zh<->ja Han-overlap case) far better
// than the 8B model; translation is short + on-demand so the extra cost is fine.
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const LANG_NAMES: Record<string, string> = {
  zh: 'Traditional Chinese (繁體中文)', en: 'English', ja: 'Japanese', ko: 'Korean',
  hi: 'Hindi', vi: 'Vietnamese', th: 'Thai', de: 'German', es: 'Spanish', fr: 'French',
};

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}

interface TranslateBody {
  texts?: string[];
  target_lang?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  let body: TranslateBody;
  try {
    body = (await request.json()) as TranslateBody;
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const target = body.target_lang ?? '';
  const texts = Array.isArray(body.texts) ? body.texts : [];
  if (!(target in LANG_NAMES)) return json({ error: 'unsupported target_lang' }, 400);
  if (!texts.length) return json({ error: 'texts required' }, 400);
  if (texts.length > 4) return json({ error: 'too many texts' }, 400);
  if (texts.some((t) => typeof t !== 'string' || t.length > 600)) {
    return json({ error: 'text invalid or too long' }, 400);
  }

  const targetName = LANG_NAMES[target];
  const system =
    `You are a translator for a campus food-sharing app. Translate the user's text into ${targetName}. ` +
    `It is a food / grocery item name or short description. Keep quantities, numbers and brand names intact. ` +
    `Always render the full result in ${targetName}, even when the source shares characters with it ` +
    `(e.g. Chinese and Japanese both use Han characters — still translate fully into ${targetName}). ` +
    `Output ONLY the translation — no quotes, no notes, no original text.`;

  try {
    const translations = await Promise.all(
      texts.map(async (text) => {
        const trimmed = text.trim();
        if (!trimmed) return '';
        const out = await env.AI.run(MODEL, {
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: trimmed },
          ],
          max_tokens: 200,
          temperature: 0.1,
        });
        // String() guards against a non-string response; strip stray wrapping quotes.
        return String(out?.response ?? trimmed).trim().replace(/^["「『]|["」』]$/g, '').trim();
      }),
    );
    return json({ translations });
  } catch {
    return json({ error: 'translate unavailable' }, 503);
  }
};
