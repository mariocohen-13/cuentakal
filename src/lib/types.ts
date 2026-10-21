export type MealKey = 'desayuno' | 'comida' | 'merienda' | 'cena' | 'otros';

export const MEALS: { key: MealKey; label: string }[] = [
  { key: 'desayuno', label: 'Desayuno' },
  { key: 'comida', label: 'Comida' },
  { key: 'merienda', label: 'Merienda' },
  { key: 'cena', label: 'Cena' },
  { key: 'otros', label: 'Otros' },
];

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** 'known' = dato de etiqueta o tabla de referencia; 'estimate' = estimación aproximada. */
export type Accuracy = 'known' | 'estimate';

/** 'g'/'ml': macros por 100 g/ml. 'ud': macros por unidad. */
export type BaseUnit = 'g' | 'ml' | 'ud';

export interface Food {
  id: string;
  name: string;
  base: BaseUnit;
  macros: Macros;
  /** Nombre de la unidad (huevo, rebanada, lata…) */
  unitName?: string;
  /** g o ml que pesa una unidad (permite registrar en unidades un alimento por 100 g). */
  unitSize?: number;
  /** Cantidad por defecto en la unidad base (g/ml) o en unidades si base='ud'. */
  defaultQty?: number;
  accuracy: Accuracy;
  source?: string;
  builtin?: boolean;
  category?: string;
}

export type EntryUnit = 'g' | 'ml' | 'ud' | 'racion';

export interface LogEntry {
  id: string;
  date: string; // YYYY-MM-DD (hora local)
  meal: MealKey;
  name: string;
  qty: number;
  unit: EntryUnit;
  unitLabel?: string;
  /** Macros por 1 unidad de `unit` (1 g, 1 ml, 1 ud, 1 ración). */
  perUnit: Macros;
  accuracy: Accuracy;
  foodId?: string;
  dishKey?: string;
  createdAt: number;
}

export type MenuSlot = 'desayuno' | 'comida' | 'cena';
export const MENU_SLOTS: { key: MenuSlot; label: string }[] = [
  { key: 'desayuno', label: 'Desayuno' },
  { key: 'comida', label: 'Comida' },
  { key: 'cena', label: 'Cena' },
];

export interface MenuDish {
  id: string;
  name: string;
  /** Macros por ración del colegio. */
  macros: Macros;
  accuracy: Accuracy;
  note?: string;
}

export type DayMenu = Record<MenuSlot, MenuDish[]>;

export interface WeekMenu {
  weekStart: string; // lunes YYYY-MM-DD
  days: DayMenu[]; // 7 días, lunes primero
  rawText?: string;
  image?: string; // dataURL reducida
  updatedAt: number;
}

export interface DishInfo {
  name: string;
  macros: Macros;
  accuracy: Accuracy;
  note?: string;
  updatedAt: number;
}

export interface SavedMealItem {
  name: string;
  qty: number;
  unit: EntryUnit;
  unitLabel?: string;
  perUnit: Macros;
  accuracy: Accuracy;
  foodId?: string;
  dishKey?: string;
}

export interface SavedMeal {
  id: string;
  name: string;
  items: SavedMealItem[];
}

export interface WeightEntry {
  date: string;
  kg: number;
}

export interface AppState {
  version: 1;
  goals: Macros;
  foods: Food[]; // alimentos propios
  favorites: string[];
  entries: LogEntry[];
  menus: Record<string, WeekMenu>;
  dishLibrary: Record<string, DishInfo>;
  savedMeals: SavedMeal[];
  weights: WeightEntry[];
  closedDays: string[];
  lastBackup?: number;
}
