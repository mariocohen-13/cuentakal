import type { AppState } from './types';
import { sanitize } from './macros';

const DEFAULT_GOALS = { kcal: 2200, protein: 140, carbs: 250, fat: 70 };

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const obj = <T,>(v: unknown): Record<string, T> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, T>) : {};

/** Valida y completa un estado leído de disco o de una copia de seguridad. */
export function normalizeState(input: unknown): AppState {
  if (!input || typeof input !== 'object') throw new Error('Formato no válido');
  const s = input as Partial<AppState> & { app?: string; data?: unknown };
  // Admite el sobre de exportación { app, exportedAt, data }
  if (s.app === 'cuentakal' && s.data) return normalizeState(s.data);
  if (s.version !== 1) throw new Error('Versión de datos no reconocida');
  const goals = s.goals ? sanitize(s.goals) : DEFAULT_GOALS;
  return {
    version: 1,
    goals: goals.kcal > 0 ? goals : DEFAULT_GOALS,
    foods: arr(s.foods),
    favorites: arr<string>(s.favorites).filter((x) => typeof x === 'string'),
    entries: arr<AppState['entries'][number]>(s.entries).filter(
      (e) => e && typeof e.date === 'string' && typeof e.qty === 'number' && e.perUnit,
    ),
    menus: obj(s.menus),
    dishLibrary: obj(s.dishLibrary),
    savedMeals: arr(s.savedMeals),
    weights: arr<AppState['weights'][number]>(s.weights).filter((w) => w && typeof w.kg === 'number'),
    closedDays: arr<string>(s.closedDays),
    lastBackup: typeof s.lastBackup === 'number' ? s.lastBackup : undefined,
  };
}

export function serializeBackup(state: AppState): string {
  return JSON.stringify({ app: 'cuentakal', exportedAt: new Date().toISOString(), data: state }, null, 2);
}

export function parseBackup(text: string): AppState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido');
  }
  return normalizeState(parsed);
}

export function downloadBackup(state: AppState): void {
  const blob = new Blob([serializeBackup(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  a.href = url;
  a.download = `cuentakal-copia-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
