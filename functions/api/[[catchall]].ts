// Catches any /api/* path that no specific function handles.
// Without this, unmatched /api/* would fall through to _redirects → index.html,
// causing the frontend's `fetch().json()` to crash on HTML.
export const onRequest: PagesFunction = () =>
  new Response(JSON.stringify({ error: 'not found' }), {
    status: 404,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
