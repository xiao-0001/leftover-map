interface Env {
  DB: D1Database;
}

interface CreateBody {
  dorm_id?: string;
  title?: string;
  description?: string;
  category?: string;
  image_data_url?: string;
  expires_at?: string;
  contact?: string;
}

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

// Keep in sync with src/data/dorms.ts
const ALLOWED_DORMS = new Set([
  'nycu-7', 'nycu-8', 'nycu-9', 'nycu-10', 'nycu-11', 'nycu-12', 'nycu-13',
  'nycu-zh', 'nycu-f2', 'nycu-r1', 'nycu-r2', 'nycu-r3',
  'nthu-qing', 'nthu-hua', 'nthu-ming', 'nthu-xinz', 'nthu-yi', 'nthu-ping',
  'nthu-cheng', 'nthu-xinA', 'nthu-xinB', 'nthu-xinC', 'nthu-ren', 'nthu-shi',
  'nthu-li', 'nthu-shuo', 'nthu-ru', 'nthu-shan', 'nthu-xue', 'nthu-hong',
  'nthu-ya', 'nthu-jing', 'nthu-hui', 'nthu-wen',
]);

const ALLOWED_CATEGORIES = new Set([
  'meal', 'snack', 'drink', 'bread', 'fruit', 'groceries', 'frozen', 'other',
]);

const MAX_EXPIRY_MS = 30 * 86400_000;
const MAX_IMAGE_BYTES = 300_000; // 300 KB raw chars (data URL is ~33% bigger than binary)

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}

function sanitizeContact(s: string): string {
  return s.replace(/[\x00-\x1F<>]/g, '').trim();
}

function isValidImageDataUrl(s: string): boolean {
  return /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const url = new URL(request.url);
    const dorm = url.searchParams.get('dorm');
    const category = url.searchParams.get('category');
    const includeAll = url.searchParams.get('all') === '1';

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (dorm) {
      conditions.push('dorm_id = ?');
      params.push(dorm);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (!includeAll) {
      conditions.push("expires_at > datetime('now')");
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const sql = `SELECT * FROM items ${where} ORDER BY claimed ASC, created_at DESC LIMIT 500`;

    const stmt = env.DB.prepare(sql);
    const { results } = await (params.length ? stmt.bind(...params) : stmt).all();
    // Strip claimer_contact from public listing — only the poster should see it,
    // and since we have no auth, never expose it in the public read endpoint.
    const sanitized = (results as Record<string, unknown>[] | undefined)?.map((r) => {
      const { claimer_contact: _drop, ...rest } = r;
      void _drop;
      return rest;
    }) ?? [];
    return json({ items: sanitized });
  } catch {
    return json({ error: 'database unavailable' }, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const dorm_id = body.dorm_id?.trim();
  const title = body.title?.trim();
  const description = body.description?.trim();
  const category = body.category?.trim();
  const image_data_url = body.image_data_url;
  const contact = body.contact ? sanitizeContact(body.contact) : '';
  const expires_at_raw = body.expires_at;

  if (!dorm_id || !title || !expires_at_raw || !contact) {
    return json({ error: 'missing fields' }, 400);
  }
  if (!ALLOWED_DORMS.has(dorm_id)) {
    return json({ error: 'unknown dorm_id' }, 400);
  }
  if (category && !ALLOWED_CATEGORIES.has(category)) {
    return json({ error: 'unknown category' }, 400);
  }
  if (title.length > 80 || contact.length > 100 || (description?.length ?? 0) > 500) {
    return json({ error: 'field too long' }, 400);
  }
  if (image_data_url) {
    if (image_data_url.length > MAX_IMAGE_BYTES) {
      return json({ error: 'image too large (max 300KB)' }, 400);
    }
    if (!isValidImageDataUrl(image_data_url)) {
      return json({ error: 'invalid image format' }, 400);
    }
  }

  const parsed = Date.parse(expires_at_raw);
  if (Number.isNaN(parsed)) return json({ error: 'invalid expires_at' }, 400);
  const now = Date.now();
  if (parsed <= now) return json({ error: 'expires_at must be in the future' }, 400);
  if (parsed > now + MAX_EXPIRY_MS) return json({ error: 'expires_at too far in future (max 30 days)' }, 400);
  const expires_at = new Date(parsed).toISOString();

  try {
    const result = await env.DB.prepare(
      'INSERT INTO items (dorm_id, title, description, category, image_data_url, expires_at, contact) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) RETURNING *',
    )
      .bind(
        dorm_id,
        title,
        description ?? null,
        category ?? null,
        image_data_url ?? null,
        expires_at,
        contact,
      )
      .first();
    return json(result, 201);
  } catch {
    return json({ error: 'database error' }, 500);
  }
};
