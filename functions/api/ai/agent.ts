// Tool-calling agent on top of the RAG chat.
//
// Grounded RAG retrieval (so plain questions still get accurate, hallucination-
// free answers), PLUS a real action: the model can call a
// `reserve_item` tool to claim a specific item for the user. This turns the
// assistant from Q&A into an agent that can *do* something on the user's behalf.
//
// Reliability note: the 8B model's tool-calling isn't perfect, so the design is
// defensive — no tool call → it just answers; a tool call → we execute it
// against D1 atomically and then have the model write the confirmation. The
// frontend sends conversation history so "ask name → then reserve" works across
// turns.

interface AiBinding {
  run: (
    model: string,
    input: unknown,
  ) => Promise<
    { response?: string; data?: number[][]; tool_calls?: ToolCall[] } & Record<string, unknown>
  >;
}
interface Env {
  DB: D1Database;
  AI: AiBinding;
}

interface ToolCall {
  name: string;
  arguments: Record<string, unknown> | string;
}

// Two models, by job:
//  - ANSWER_MODEL (8B): fast grounded Q&A and writing confirmations. Used for
//    plain questions (the common case) so answers come back in a few seconds.
//  - TOOL_MODEL (70B): only the reserve tool-call path. The 8B picked item ids
//    unreliably (reserved the wrong item); the 70B matches the requested item
//    to its id correctly.
// We ALSO only attach tools when the user shows reserve intent — a tool-equipped
// 70B otherwise sometimes refuses general questions ("outside the scope of my
// functions"), which broke plain Q&A.
const ANSWER_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const TOOL_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const EMBED_MODEL = '@cf/baai/bge-m3';
const TOP_K = 8;

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}

const DORM_NAMES: Record<string, string> = {
  'nycu-7': 'NYCU 交大七舍', 'nycu-8': 'NYCU 交大八舍', 'nycu-9': 'NYCU 交大九舍',
  'nycu-10': 'NYCU 交大十舍', 'nycu-11': 'NYCU 交大十一舍', 'nycu-12': 'NYCU 交大十二舍',
  'nycu-13': 'NYCU 交大十三舍', 'nycu-zh': 'NYCU 竹軒', 'nycu-f2': 'NYCU 女二舍',
  'nycu-r1': 'NYCU 研一舍', 'nycu-r2': 'NYCU 研二舍', 'nycu-r3': 'NYCU 研三舍',
  'nthu-qing': 'NTHU 清齋', 'nthu-hua': 'NTHU 華齋', 'nthu-ming': 'NTHU 明齋',
  'nthu-xinz': 'NTHU 新齋', 'nthu-yi': 'NTHU 義齋', 'nthu-ping': 'NTHU 平齋',
  'nthu-cheng': 'NTHU 誠齋', 'nthu-xinA': 'NTHU 信齋 A', 'nthu-xinB': 'NTHU 信齋 B',
  'nthu-xinC': 'NTHU 信齋 C', 'nthu-ren': 'NTHU 仁齋', 'nthu-shi': 'NTHU 實齋',
  'nthu-li': 'NTHU 禮齋', 'nthu-shuo': 'NTHU 碩齋', 'nthu-ru': 'NTHU 儒齋',
  'nthu-shan': 'NTHU 善齋', 'nthu-xue': 'NTHU 學齋', 'nthu-hong': 'NTHU 鴻齋',
  'nthu-ya': 'NTHU 雅齋', 'nthu-jing': 'NTHU 靜齋', 'nthu-hui': 'NTHU 慧齋',
  'nthu-wen': 'NTHU 文齋',
};

const LANG_NAMES: Record<string, string> = {
  zh: 'Traditional Chinese (繁體中文)', en: 'English', ja: 'Japanese (日本語)',
  ko: 'Korean (한국어)', hi: 'Hindi', vi: 'Vietnamese', th: 'Thai',
  de: 'German', es: 'Spanish', fr: 'French',
};

const TOOLS = [
  {
    name: 'reserve_item',
    description:
      'Reserve / claim a specific dorm food item for the user, so the original poster knows someone will pick it up. ' +
      'Only call this when the user clearly wants a specific item AND you already know their name. ' +
      "If you don't know the user's name yet, ask them for it first and do NOT call this tool.",
    parameters: {
      type: 'object',
      properties: {
        item_id: {
          type: 'integer',
          description: 'Numeric id of the item to reserve (each context item is labelled like "[id 34]").',
        },
        name: {
          type: 'string',
          description: "The user's name or room number, so the poster can coordinate the handoff.",
        },
      },
      required: ['item_id', 'name'],
    },
  },
];

interface ItemRow {
  id: number;
  dorm_id: string;
  title: string;
  category: string | null;
  description: string | null;
  expires_at: string;
  contact: string;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

function itemLine(r: ItemRow): string {
  const dorm = DORM_NAMES[r.dorm_id] ?? r.dorm_id;
  const cat = r.category ? ` [${r.category}]` : '';
  return `- [id ${r.id}] ${r.title}${cat} @ ${dorm} (expires ${r.expires_at})`;
}

async function retrieve(env: Env, query: string, rows: ItemRow[]): Promise<ItemRow[]> {
  if (rows.length <= TOP_K) return rows;
  try {
    const texts = rows.map((r) => `${r.title}. ${r.description ?? ''} @ ${DORM_NAMES[r.dorm_id] ?? r.dorm_id}`);
    const [qEmb, itemEmb] = await Promise.all([
      env.AI.run(EMBED_MODEL, { text: [query] }),
      env.AI.run(EMBED_MODEL, { text: texts }),
    ]);
    const q = qEmb?.data?.[0];
    const vecs = itemEmb?.data;
    if (q && Array.isArray(vecs) && vecs.length === rows.length) {
      return rows
        .map((r, i) => ({ r, s: cosine(q, vecs[i]) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, TOP_K)
        .map((x) => x.r);
    }
  } catch {
    /* fall through */
  }
  return rows.slice(0, TOP_K);
}

function parseArgs(tc: ToolCall): Record<string, unknown> {
  if (typeof tc.arguments === 'string') {
    try {
      return JSON.parse(tc.arguments) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return tc.arguments ?? {};
}

interface AgentBody {
  messages?: ChatMsg[];
  lang?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  let body: AgentBody;
  try {
    body = (await request.json()) as AgentBody;
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const lang = body.lang && body.lang in LANG_NAMES ? body.lang : 'en';
  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-8);
  const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content?.trim() ?? '';
  if (!lastUser) return json({ error: 'no user message' }, 400);
  if (lastUser.length > 500) return json({ error: 'message too long' }, 400);

  // Candidate live items.
  let rows: ItemRow[] = [];
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, dorm_id, title, category, description, expires_at, contact
         FROM items
        WHERE claimed = 0 AND expires_at > datetime('now')
        ORDER BY expires_at ASC LIMIT 100`,
    ).all();
    rows = (results as ItemRow[] | undefined) ?? [];
  } catch {
    /* answer without grounding */
  }

  const top = await retrieve(env, lastUser, rows);
  const context = top.length ? top.map(itemLine).join('\n') : '(no items currently available)';
  const langName = LANG_NAMES[lang] || LANG_NAMES.en;

  const system =
    'You are the assistant for "Leftover Map", a campus food-sharing app (NYCU & NTHU, Hsinchu). ' +
    'Answer questions using ONLY the items in RELEVANT DORM ITEMS below. ' +
    'List only items that literally appear there — never invent items, flavors, drinks or extras. ' +
    'Do NOT call reserve_item for general questions like "what is available". ' +
    'Only call reserve_item when the user EXPLICITLY says they want to take / reserve / claim a specific item AND has told you their own name. ' +
    'If they want an item but have not given their name, ask for their name and do not call the tool. ' +
    `Reply in ${langName}. Be concise.\n\nRELEVANT DORM ITEMS:\n${context}`;

  const messages = [{ role: 'system', content: system }, ...history];

  // Reserve-intent gate, computed up-front. English verbs are \b-bounded so
  // "reservation"/"take advantage" don't trigger; CJK/other matched literally.
  // Checked across ALL user turns (intent may precede the name).
  const INTENT =
    /(預約|預訂|預定|我要拿|我想拿|幫我拿|幫我預|예약|予約|đặt|nhận|จอง|reservar|réserv|\b(claim|reserve|book it|take it|i'?ll take|i want to take)\b)/i;
  const userText = history.filter((m) => m.role === 'user').map((m) => m.content).join(' \n ');
  const intentPresent = INTENT.test(userText);

  // Common case — a plain question. Answer with the fast model and NO tools, so
  // it comes back quickly and never refuses ("outside the scope of my functions").
  if (!intentPresent) {
    try {
      const out = await env.AI.run(ANSWER_MODEL, { messages, max_tokens: 400, temperature: 0.3 });
      return json({ answer: String(out?.response ?? '').trim() || '…', reserved: null });
    } catch {
      return json({ error: 'ai unavailable' }, 503);
    }
  }

  // Reserve intent present → use the 70B model WITH the reserve tool.
  let first;
  try {
    first = await env.AI.run(TOOL_MODEL, { messages, tools: TOOLS, max_tokens: 400, temperature: 0.2 });
  } catch {
    return json({ error: 'ai unavailable' }, 503);
  }

  const toolCalls = Array.isArray(first?.tool_calls) ? first.tool_calls : [];
  const reserve = toolCalls.find((tc) => tc.name === 'reserve_item');

  const args = reserve ? parseArgs(reserve) : {};
  const itemId = Number(args.item_id);
  const claimerName = String(args.name ?? '').slice(0, 30).trim();
  // The item must be a real, live item from the candidate set (not a hallucinated id),
  // and the name must genuinely come from the user's own message (min 2 chars to avoid
  // single-character substring collisions).
  const itemKnown = !!itemId && rows.some((r) => r.id === itemId);
  const nameFromUser =
    claimerName.length >= 2 &&
    history.some((m) => m.role === 'user' && m.content.toLowerCase().includes(claimerName.toLowerCase()));

  // Intent present but the model didn't call the tool (e.g. it's asking the user
  // for their name) → return its message, or a fast-model answer if it's empty.
  if (!reserve) {
    let answer = String(first?.response ?? '').trim();
    if (!answer) {
      try {
        const out = await env.AI.run(ANSWER_MODEL, { messages, max_tokens: 400, temperature: 0.3 });
        answer = String(out?.response ?? '').trim();
      } catch {
        /* keep whatever we have */
      }
    }
    return json({ answer: answer || '…', reserved: null });
  }

  let outcomeSystem: string;
  let reserved: { id: number; title: string; dorm: string; contact: string } | null = null;

  if (!itemKnown || !nameFromUser) {
    const missing = !nameFromUser ? "the user's own name (never guess or make one up)" : 'which item from the list (its id)';
    outcomeSystem =
      `The user wants to reserve an item but you are missing ${missing}. ` +
      `Politely ask them for it and do not claim anything. Reply in ${langName}.`;
  } else {
    try {
      const row = (await env.DB.prepare(
        `UPDATE items SET claimed = 1, claimer_name = ?2, claimed_at = datetime('now')
           WHERE id = ?1 AND claimed = 0 AND expires_at > datetime('now') RETURNING *`,
      )
        .bind(itemId, claimerName)
        .first()) as ItemRow | null;
      if (row) {
        const dorm = DORM_NAMES[row.dorm_id] ?? row.dorm_id;
        reserved = { id: row.id, title: row.title, dorm, contact: row.contact };
        outcomeSystem =
          `You successfully reserved "${row.title}" at ${dorm} for ${claimerName}. ` +
          `Give a short friendly confirmation and tell them the poster's contact to arrange pickup: "${row.contact}". ` +
          `Reply in ${langName}.`;
      } else {
        outcomeSystem =
          `The item (id ${itemId}) was already taken or no longer available. ` +
          `Apologise briefly and suggest checking other items. Reply in ${langName}.`;
      }
    } catch {
      outcomeSystem = `A technical error stopped the reservation. Ask the user to try again. Reply in ${langName}.`;
    }
  }

  // Second pass: model writes the user-facing message about the outcome.
  let answer = '';
  try {
    const second = await env.AI.run(ANSWER_MODEL, {
      messages: [
        { role: 'system', content: outcomeSystem },
        { role: 'user', content: lastUser },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });
    answer = String(second?.response ?? '').trim();
  } catch {
    answer = reserved
      ? `✅ Reserved "${reserved.title}" at ${reserved.dorm}. Contact the poster: ${reserved.contact}`
      : 'Sorry, that item is no longer available.';
  }

  return json({ answer: answer || '…', reserved });
};
