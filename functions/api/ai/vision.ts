// Photo auto-tagging for the "post an item" form.
// Primary: Llama 3.2 11B Vision — a strong vision-language model that reads the
// photo and returns the {title, category} tags directly in the user's language
// in ONE call. Fallback: the older LLaVA caption -> Llama JSON two-step, in case
// the vision model is unavailable. Either way it's a pre-fill-then-confirm flow.

interface AiBinding {
  run: (
    model: string,
    input: unknown,
  ) => Promise<{ response?: string; description?: string } & Record<string, unknown>>;
}
interface Env {
  AI: AiBinding;
}

const VISION_LM = '@cf/meta/llama-3.2-11b-vision-instruct'; // primary
const CAPTION_MODEL = '@cf/llava-hf/llava-1.5-7b-hf'; // fallback captioner
const TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct'; // fallback JSON-ifier

const CATEGORIES = ['meal', 'snack', 'drink', 'bread', 'fruit', 'groceries', 'frozen', 'other'];

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

// Keyword fallback so we always return a usable category.
function guessCategory(caption: string): string {
  const c = caption.toLowerCase();
  if (/\b(rice|bento|noodle|pasta|meal|lunch|dinner|curry|soup|dumpling|sushi)\b/.test(c)) return 'meal';
  if (/\b(bread|toast|bun|croissant|bagel|pastry|cake|donut|baguette)\b/.test(c)) return 'bread';
  if (/\b(drink|juice|tea|coffee|soda|water|milk|beverage|bottle|can|cola|soy ?milk)\b/.test(c)) return 'drink';
  if (/\b(apple|banana|orange|fruit|grape|berry|melon|mango|strawberr)\b/.test(c)) return 'fruit';
  if (/\b(chip|cookie|snack|candy|chocolate|cracker|biscuit|yogurt)\b/.test(c)) return 'snack';
  if (/\b(frozen|ice ?cream|popsicle|dumpling)\b/.test(c)) return 'frozen';
  if (/\b(jar|sauce|flour|grocery|instant|pack|noodle)\b/.test(c)) return 'groceries';
  return 'other';
}

function dataUrlToBytes(dataUrl: string): number[] | null {
  const m = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  try {
    const bin = atob(m[2]);
    const bytes = new Array<number>(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

// Safely pull text out of a model result, whatever shape it takes. Crucially
// never returns "[object Object]" — if the field is an object we stringify it
// so any embedded {title,category} can still be mined, otherwise empty.
function textOf(out: { response?: unknown; description?: unknown } | null | undefined): string {
  const r = out?.response ?? out?.description;
  if (typeof r === 'string') return r.trim();
  if (r && typeof r === 'object') return JSON.stringify(r);
  return '';
}

// Sanitise a candidate title: never let a JSON blob, "[object Object]", or
// whitespace become the displayed title. Empty result signals "no good title".
function cleanTitle(s: string): string {
  let t = s.replace(/[\r\n]+/g, ' ').trim();
  if (!t || t === '[object Object]' || /^[{[]/.test(t)) return '';
  return t.slice(0, 80);
}

function extractTags(raw: string, fallbackText: string): { title: string; category: string } {
  let title = '';
  let category = guessCategory(fallbackText || raw);
  const match = /\{[\s\S]*\}/.exec(raw);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as { title?: string; category?: string };
      if (parsed.title && String(parsed.title).trim()) title = String(parsed.title).trim().slice(0, 80);
      if (parsed.category && CATEGORIES.includes(parsed.category)) category = parsed.category;
    } catch {
      /* keep fallback */
    }
  }
  return { title, category };
}

interface VisionBody {
  image_data_url?: string;
  lang?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  let body: VisionBody;
  try {
    body = (await request.json()) as VisionBody;
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const dataUrl = body.image_data_url ?? '';
  const lang = body.lang && body.lang in LANG_NAMES ? body.lang : 'en';
  if (!dataUrl) return json({ error: 'image_data_url required' }, 400);
  if (dataUrl.length > 400_000) return json({ error: 'image too large' }, 400);

  const bytes = dataUrlToBytes(dataUrl);
  if (!bytes) return json({ error: 'invalid image' }, 400);

  const prompt =
    `This photo is for a campus food-sharing app. Identify the food or grocery item. ` +
    `Reply with ONLY minified JSON: {"title": string, "category": string}. ` +
    `"title" is a concise item name (max 6 words) in ${LANG_NAMES[lang]}. ` +
    `"category" is exactly one of: ${CATEGORIES.join(', ')}.`;

  // Turn a free-text caption into {title, category} via the small text model.
  async function jsonify(caption: string): Promise<{ title: string; category: string }> {
    try {
      const out = await env.AI.run(TEXT_MODEL, {
        messages: [
          {
            role: 'system',
            content:
              `Convert a food photo caption into a listing. Output ONLY minified JSON {"title": string, "category": string}. ` +
              `"title" max 6 words in ${LANG_NAMES[lang]}. "category" one of: ${CATEGORIES.join(', ')}. No extra text.`,
          },
          { role: 'user', content: `Caption: ${caption}` },
        ],
        max_tokens: 120,
        temperature: 0.2,
      });
      const tags = extractTags(textOf(out), caption);
      if (tags.title) return tags;
    } catch {
      /* fall through */
    }
    return { title: cleanTitle(caption), category: guessCategory(caption) };
  }

  // --- Primary: Llama 3.2 Vision reads the image (stronger than LLaVA) ---
  try {
    const out = await env.AI.run(VISION_LM, { image: bytes, prompt, max_tokens: 200, temperature: 0.2 });
    const raw = textOf(out);
    if (raw && raw !== '{}') {
      // It may already return JSON tags; if not, treat its text as a caption.
      const direct = extractTags(raw, raw);
      const tags = direct.title ? direct : await jsonify(raw);
      if (tags.title && tags.title.trim()) return json({ ...tags, model: 'llama-3.2-vision' });
    }
  } catch {
    // gated/unavailable → fall through to the LLaVA captioner
  }

  // --- Fallback: LLaVA caption -> Llama JSON ---
  let caption = '';
  try {
    const cap = await env.AI.run(CAPTION_MODEL, {
      image: bytes,
      prompt:
        'Describe the food or grocery item in this photo in one short sentence. If there is packaging or a label, mention the product name.',
      max_tokens: 120,
    });
    caption = textOf(cap);
  } catch {
    return json({ error: 'vision unavailable' }, 503);
  }
  if (!caption) return json({ error: 'no caption' }, 503);

  const tags = await jsonify(caption);
  return json({ ...tags, caption, model: 'llava-fallback' });
};
