import type { Lang } from '../i18n';

interface CatalogEntry {
  zh: string;
  en: string;
  ja: string;
  original: number;
  discount: number;
  category: 'rice' | 'sandwich' | 'pasta' | 'salad' | 'bread' | 'dessert';
}

const CATALOG: CatalogEntry[] = [
  { zh: '鮪魚御飯糰',      en: 'Tuna Onigiri',         ja: 'ツナおにぎり',         original: 30, discount: 18, category: 'rice' },
  { zh: '雞肉沙拉三明治',   en: 'Chicken Salad Sandwich', ja: 'チキンサラダサンド',   original: 45, discount: 27, category: 'sandwich' },
  { zh: '日式炒麵便當',     en: 'Yakisoba Bento',       ja: '焼きそば弁当',         original: 80, discount: 50, category: 'pasta' },
  { zh: '凱薩雞肉沙拉',     en: 'Caesar Chicken Salad', ja: 'シーザーチキンサラダ', original: 75, discount: 45, category: 'salad' },
  { zh: '蜂蜜吐司',         en: 'Honey Toast',          ja: 'ハニートースト',       original: 35, discount: 20, category: 'bread' },
  { zh: '巧克力可頌',       en: 'Chocolate Croissant',  ja: 'チョコクロワッサン',   original: 40, discount: 24, category: 'bread' },
  { zh: '布丁',             en: 'Pudding',              ja: 'プリン',               original: 28, discount: 15, category: 'dessert' },
  { zh: '梅子飯糰',         en: 'Plum Onigiri',         ja: '梅おにぎり',           original: 32, discount: 19, category: 'rice' },
  { zh: '紅豆麵包',         en: 'Red Bean Bun',         ja: 'あんパン',             original: 25, discount: 15, category: 'bread' },
  { zh: '經典義大利麵',     en: 'Classic Spaghetti',    ja: 'スパゲッティ',         original: 79, discount: 49, category: 'pasta' },
  { zh: '火腿蛋三明治',     en: 'Ham & Egg Sandwich',   ja: 'ハムエッグサンド',     original: 40, discount: 25, category: 'sandwich' },
  { zh: '抹茶大福',         en: 'Matcha Daifuku',       ja: '抹茶大福',             original: 38, discount: 22, category: 'dessert' },
];

export interface MockCVSItem {
  title: string;
  original: number;
  discount: number;
  qty: number;
  expires: string;
  category: CatalogEntry['category'];
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function makeRand(seed: number) {
  let x = seed;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

const EMOJI: Record<MockCVSItem['category'], string> = {
  rice: '🍙', sandwich: '🥪', pasta: '🍝', salad: '🥗', bread: '🥐', dessert: '🍰',
};

export function categoryEmoji(c: MockCVSItem['category']) {
  return EMOJI[c];
}

function titleForLang(entry: CatalogEntry, lang: Lang): string {
  if (lang === 'zh') return entry.zh;
  if (lang === 'ja') return entry.ja;
  return entry.en;
}

export function generateMockItems(storeId: string | number, lang: Lang): MockCVSItem[] {
  const seed = hashString(String(storeId));
  const rand = makeRand(seed);
  const count = 2 + Math.floor(rand() * 4);
  const picks: MockCVSItem[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    let idx = Math.floor(rand() * CATALOG.length);
    while (used.has(idx)) idx = (idx + 1) % CATALOG.length;
    used.add(idx);
    const base = CATALOG[idx];
    const qty = 1 + Math.floor(rand() * 4);
    const hoursLeft = 1 + Math.floor(rand() * 6);
    const expires = new Date(Date.now() + hoursLeft * 3600_000);
    picks.push({
      title: titleForLang(base, lang),
      original: base.original,
      discount: base.discount,
      category: base.category,
      qty,
      expires: expires.toISOString(),
    });
  }
  return picks;
}
