import type { LeftoverItem } from '../types';

const BASE = '/api';

export async function listItems(dormId?: string): Promise<LeftoverItem[]> {
  const url = dormId ? `${BASE}/items?dorm=${encodeURIComponent(dormId)}` : `${BASE}/items`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    throw new Error('API returned non-JSON (likely SPA fallback / route misconfigured)');
  }
  const data = (await res.json()) as { items?: LeftoverItem[] } | null;
  return Array.isArray(data?.items) ? data!.items! : [];
}

export interface CreateItemInput {
  dorm_id: string;
  title: string;
  description?: string;
  category?: string;
  image_data_url?: string;
  expires_at: string; // ISO
  contact: string;
}

export async function createItem(input: CreateItemInput): Promise<LeftoverItem> {
  const res = await fetch(`${BASE}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`create failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as LeftoverItem;
}

export interface ClaimInput {
  claimer_name: string;
  claimer_contact?: string;
}

export async function claimItem(id: number, input: ClaimInput): Promise<LeftoverItem> {
  const res = await fetch(`${BASE}/items/${id}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`claim failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as LeftoverItem;
}

// --- AI features (Cloudflare Workers AI, server-side) ---

export interface AgentMsg {
  role: 'user' | 'assistant';
  content: string;
}
export interface AgentReply {
  answer: string;
  reserved: { id: number; title: string; dorm: string; contact: string } | null;
}

// Tool-calling agent: grounded RAG answers that can ALSO reserve an item.
// Sends conversation history so multi-turn ("ask name → reserve") works.
export async function askAgent(messages: AgentMsg[], lang: string): Promise<AgentReply> {
  const res = await fetch(`${BASE}/ai/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, lang }),
  });
  const data = (await res.json().catch(() => null)) as (Partial<AgentReply> & { error?: string }) | null;
  if (!res.ok || !data?.answer) throw new Error(data?.error || `agent failed: ${res.status}`);
  return { answer: data.answer, reserved: data.reserved ?? null };
}

export async function translateTexts(texts: string[], targetLang: string): Promise<string[]> {
  const res = await fetch(`${BASE}/ai/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, target_lang: targetLang }),
  });
  const data = (await res.json().catch(() => null)) as { translations?: string[]; error?: string } | null;
  if (!res.ok || !Array.isArray(data?.translations)) {
    throw new Error(data?.error || `translate failed: ${res.status}`);
  }
  return data.translations;
}

export interface VisionResult {
  title: string;
  category: string;
  caption?: string;
}

export async function recognizeImage(imageDataUrl: string, lang: string): Promise<VisionResult> {
  const res = await fetch(`${BASE}/ai/vision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_data_url: imageDataUrl, lang }),
  });
  const data = (await res.json().catch(() => null)) as (VisionResult & { error?: string }) | null;
  if (!res.ok || !data?.title) throw new Error(data?.error || `vision failed: ${res.status}`);
  return { title: data.title, category: data.category, caption: data.caption };
}
