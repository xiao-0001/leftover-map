interface Env {
  DB: D1Database;
}

interface ClaimBody {
  claimer_name?: string;
  claimer_contact?: string;
}

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}

function sanitize(s: string): string {
  return s.replace(/[\x00-\x1F<>]/g, '').trim();
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return json({ error: 'invalid id' }, 400);
  }

  let body: ClaimBody = {};
  // Body is optional for backward compat, but recommended.
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as ClaimBody;
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const claimer_name = body.claimer_name ? sanitize(body.claimer_name) : '';
  const claimer_contact = body.claimer_contact ? sanitize(body.claimer_contact) : '';

  if (!claimer_name) {
    return json({ error: 'claimer_name required' }, 400);
  }
  if (claimer_name.length > 30) {
    return json({ error: 'claimer_name too long (max 30)' }, 400);
  }
  if (claimer_contact.length > 100) {
    return json({ error: 'claimer_contact too long (max 100)' }, 400);
  }

  try {
    const row = await env.DB.prepare(
      `UPDATE items
         SET claimed = 1,
             claimer_name = ?2,
             claimer_contact = ?3,
             claimed_at = datetime('now')
       WHERE id = ?1 AND claimed = 0 AND expires_at > datetime('now')
       RETURNING *`,
    )
      .bind(id, claimer_name, claimer_contact || null)
      .first();
    if (!row) return json({ error: 'not found or already claimed' }, 404);
    return json(row);
  } catch {
    return json({ error: 'database error' }, 500);
  }
};
