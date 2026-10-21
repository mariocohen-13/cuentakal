import { setState } from './store';
import type { AppState, DishInfo, EntryUnit, Food, LogEntry, Macros, MealKey, MenuDish, SavedMeal, WeekMenu } from './types';
import { uid } from './id';
import { normalizeName } from './estimate';

export function setGoals(goals: Macros) {
  setState((s) => ({ ...s, goals }));
}

export interface NewEntry {
  date: string;
  meal: MealKey;
  name: string;
  qty: number;
  unit: EntryUnit;
  unitLabel?: string;
  perUnit: Macros;
  accuracy: LogEntry['accuracy'];
  foodId?: string;
  dishKey?: string;
}

export function addEntries(list: NewEntry[]) {
  const now = Date.now();
  setState((s) => ({
    ...s,
    entries: [...s.entries, ...list.map((e, i) => ({ ...e, id: uid(), createdAt: now + i }))],
  }));
}

export function addEntry(e: NewEntry) {
  addEntries([e]);
}

export function updateEntry(id: string, patch: Partial<LogEntry>) {
  setState((s) => ({ ...s, entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
}

export function deleteEntry(id: string) {
  setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
}

export function saveFood(food: Food) {
  setState((s) => {
    const exists = s.foods.some((f) => f.id === food.id);
    return { ...s, foods: exists ? s.foods.map((f) => (f.id === food.id ? food : f)) : [...s.foods, food] };
  });
}

export function deleteFood(id: string) {
  setState((s) => ({ ...s, foods: s.foods.filter((f) => f.id !== id), favorites: s.favorites.filter((f) => f !== id) }));
}

export function toggleFavorite(id: string) {
  setState((s) => ({
    ...s,
    favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
  }));
}

export function saveWeekMenu(menu: WeekMenu) {
  setState((s) => ({ ...s, menus: { ...s.menus, [menu.weekStart]: { ...menu, updatedAt: Date.now() } } }));
}

export function deleteWeekMenu(weekStart: string) {
  setState((s) => {
    const menus = { ...s.menus };
    delete menus[weekStart];
    return { ...s, menus };
  });
}

/** Guarda la corrección de un plato en la biblioteca para reutilizarla en semanas futuras. */
export function rememberDish(dish: MenuDish) {
  const key = normalizeName(dish.name);
  if (!key) return;
  const info: DishInfo = { name: dish.name, macros: dish.macros, accuracy: dish.accuracy, note: dish.note, updatedAt: Date.now() };
  setState((s) => ({ ...s, dishLibrary: { ...s.dishLibrary, [key]: info } }));
}

export function forgetDish(key: string) {
  setState((s) => {
    const dishLibrary = { ...s.dishLibrary };
    delete dishLibrary[key];
    return { ...s, dishLibrary };
  });
}

export function saveMeal(meal: SavedMeal) {
  setState((s) => {
    const exists = s.savedMeals.some((m) => m.id === meal.id);
    return { ...s, savedMeals: exists ? s.savedMeals.map((m) => (m.id === meal.id ? meal : m)) : [...s.savedMeals, meal] };
  });
}

export function deleteSavedMeal(id: string) {
  setState((s) => ({ ...s, savedMeals: s.savedMeals.filter((m) => m.id !== id) }));
}

export function setWeight(date: string, kg: number | null) {
  setState((s) => {
    const rest = s.weights.filter((w) => w.date !== date);
    const weights = kg && kg > 0 ? [...rest, { date, kg }] : rest;
    weights.sort((a, b) => a.date.localeCompare(b.date));
    return { ...s, weights };
  });
}

export function setDayClosed(date: string, closed: boolean) {
  setState((s) => ({
    ...s,
    closedDays: closed ? Array.from(new Set([...s.closedDays, date])) : s.closedDays.filter((d) => d !== date),
  }));
}

export function markBackup() {
  setState((s) => ({ ...s, lastBackup: Date.now() }));
}

export function importState(next: AppState) {
  setState(() => next);
}
