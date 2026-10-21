import type { LogEntry, Macros } from './types';

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function add(a: Macros, b: Macros): Macros {
  return { kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat };
}

export function sub(a: Macros, b: Macros): Macros {
  return { kcal: a.kcal - b.kcal, protein: a.protein - b.protein, carbs: a.carbs - b.carbs, fat: a.fat - b.fat };
}

export function scale(m: Macros, f: number): Macros {
  return { kcal: m.kcal * f, protein: m.protein * f, carbs: m.carbs * f, fat: m.fat * f };
}

export function sum(list: Macros[]): Macros {
  return list.reduce(add, ZERO);
}

export function entryMacros(e: Pick<LogEntry, 'perUnit' | 'qty'>): Macros {
  return scale(e.perUnit, e.qty);
}

/** kcal derivadas de los macros (4/4/9). */
export function kcalFromMacros(m: Pick<Macros, 'protein' | 'carbs' | 'fat'>): number {
  return m.protein * 4 + m.carbs * 4 + m.fat * 9;
}

export function r0(n: number): number {
  return Math.round(n);
}

export function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function fmt(n: number): string {
  return Math.round(n).toLocaleString('es-ES');
}

export function sanitize(m: Partial<Macros>): Macros {
  const num = (v: unknown) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : 0);
  return { kcal: num(m.kcal), protein: num(m.protein), carbs: num(m.carbs), fat: num(m.fat) };
}
