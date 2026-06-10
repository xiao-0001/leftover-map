export type CategoryId = 'meal' | 'snack' | 'drink' | 'bread' | 'fruit' | 'groceries' | 'frozen' | 'other';

export const CATEGORIES: { id: CategoryId; emoji: string; color: string }[] = [
  { id: 'meal',      emoji: '🍱', color: '#f59e0b' },
  { id: 'snack',     emoji: '🍪', color: '#a855f7' },
  { id: 'drink',     emoji: '🥤', color: '#0ea5e9' },
  { id: 'bread',     emoji: '🍞', color: '#d97706' },
  { id: 'fruit',     emoji: '🍎', color: '#ef4444' },
  { id: 'groceries', emoji: '🛒', color: '#10b981' },
  { id: 'frozen',    emoji: '❄️', color: '#3b82f6' },
  { id: 'other',     emoji: '📦', color: '#6b7280' },
];

export function categoryById(id?: string | null) {
  return CATEGORIES.find((c) => c.id === id);
}
