import type { AppState, LogEntry, Macros, MealKey } from './types';
import { MEALS } from './types';
import { entryMacros, sum, ZERO } from './macros';
import { addDays, weekStart } from './date';

export function entriesFor(state: AppState, date: string): LogEntry[] {
  return state.entries.filter((e) => e.date === date).sort((a, b) => a.createdAt - b.createdAt);
}

export function dayTotals(entries: LogEntry[]): Macros {
  return sum(entries.map(entryMacros));
}

export function byMeal(entries: LogEntry[]): Record<MealKey, LogEntry[]> {
  const out = Object.fromEntries(MEALS.map((m) => [m.key, [] as LogEntry[]])) as Record<MealKey, LogEntry[]>;
  for (const e of entries) (out[e.meal] ?? out.otros).push(e);
  return out;
}

export type DayStatus = 'empty' | 'partial' | 'low' | 'ok' | 'high';

/**
 * empty   → sin ningún registro (no se cuenta en medias)
 * partial → hay registros pero el día no está marcado como completo y es bajo (posible registro incompleto)
 * low     → día marcado como completo con consumo realmente bajo (< 70 % del objetivo)
 * ok / high
 */
export function dayStatus(state: AppState, date: string): DayStatus {
  const list = entriesFor(state, date);
  if (!list.length) return 'empty';
  const kcal = dayTotals(list).kcal;
  const ratio = state.goals.kcal > 0 ? kcal / state.goals.kcal : 1;
  const closed = state.closedDays.includes(date);
  if (ratio > 1.1) return 'high';
  if (ratio < 0.7) return closed ? 'low' : 'partial';
  return 'ok';
}

export const STATUS_LABEL: Record<DayStatus, string> = {
  empty: 'Sin registrar',
  partial: 'Incompleto',
  low: 'Consumo bajo',
  ok: 'En objetivo',
  high: 'Por encima',
};

export interface WeekSummary {
  weekStart: string;
  daysLogged: number;
  avg: Macros;
  days: { date: string; totals: Macros; status: DayStatus; count: number }[];
}

/** Medias sobre días con registro (los días sin registrar no cuentan como 0). */
export function weekSummary(state: AppState, anyDayInWeek: string): WeekSummary {
  const ws = weekStart(anyDayInWeek);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(ws, i);
    const list = entriesFor(state, date);
    return { date, totals: dayTotals(list), status: dayStatus(state, date), count: list.length };
  });
  const logged = days.filter((d) => d.status !== 'empty');
  const total = sum(logged.map((d) => d.totals));
  const n = logged.length;
  const avg = n ? { kcal: total.kcal / n, protein: total.protein / n, carbs: total.carbs / n, fat: total.fat / n } : ZERO;
  return { weekStart: ws, daysLogged: n, avg, days };
}
