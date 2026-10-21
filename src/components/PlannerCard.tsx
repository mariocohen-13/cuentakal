import { useMemo } from 'react';
import { useAppState } from '../lib/store';
import { addEntries } from '../lib/actions';
import { entriesFor, dayTotals, byMeal } from '../lib/stats';
import { planRest, type PlanOption } from '../lib/planner';
import { weekStart, weekdayIndex } from '../lib/date';
import { normalizeName } from '../lib/estimate';
import { fmt } from '../lib/macros';
import { MacroLine, toast } from './ui';
import { unitText } from './EntrySheet';

export function PlannerCard({ date }: { date: string }) {
  const s = useAppState();
  const plan = useMemo(() => {
    const list = entriesFor(s, date);
    const meals = byMeal(list);
    const cenaMenu = s.menus[weekStart(date)]?.days[weekdayIndex(date)]?.cena ?? [];
    return planRest({
      goals: s.goals, consumed: dayTotals(list),
      meriendaDone: meals.merienda.length > 0, cenaDone: meals.cena.length > 0, cenaMenu,
    });
  }, [s, date]);

  const accept = (o: PlanOption) => {
    if (o.fromMenu && o.menuDishes) {
      addEntries(o.menuDishes.map(({ dish, factor }) => ({
        date, meal: 'cena', name: dish.name, qty: factor, unit: 'racion', perUnit: dish.macros, accuracy: dish.accuracy, dishKey: normalizeName(dish.name),
      })));
    } else {
      addEntries(o.items.map((it) => ({
        date, meal: o.meal, name: it.name, qty: it.qty, unit: it.unit, unitLabel: it.unitLabel, perUnit: it.perUnit, accuracy: 'known', foodId: it.foodId,
      })));
    }
    toast(`Añadido a ${o.meal}`);
  };

  return (
    <div className="card">
      <h2>¿Qué me queda por comer?</h2>
      <div className="small muted mb">
        Quedan <b style={{ color: 'var(--text)' }}>{fmt(Math.max(0, plan.remaining.kcal))} kcal</b> · P {fmt(Math.max(0, plan.remaining.protein))} g · C {fmt(Math.max(0, plan.remaining.carbs))} g · G {fmt(Math.max(0, plan.remaining.fat))} g
      </div>
      {plan.message && <div className="notice info">{plan.message}</div>}
      {plan.notes.map((n) => <div key={n} className="notice info mb">{n}</div>)}
      {plan.pending.map((meal) => (
        <div key={meal} className="mt">
          <div className="slot-title">
            {meal === 'merienda' ? 'Merienda' : 'Cena'} · objetivo aprox. {fmt(plan.targets[meal]!.kcal)} kcal, {fmt(plan.targets[meal]!.protein)} g proteína
          </div>
          {plan.options[meal]!.map((o) => (
            <div key={o.id} className="plan-opt">
              <div className="row">
                <b className="grow">{o.name}</b>
                <button className="btn small" onClick={() => accept(o)}>Añadir</button>
              </div>
              <ul>
                {o.fromMenu
                  ? o.menuDishes!.map(({ dish, factor }) => <li key={dish.id}>{dish.name} — {factor === 1 ? 'ración entera' : 'media ración'}</li>)
                  : o.items.map((it) => <li key={it.foodId}>{it.name} — {unitText(it)}</li>)}
              </ul>
              <div className="tiny muted"><MacroLine m={o.totals} />{o.tip ? ` · ${o.tip}` : ''}</div>
            </div>
          ))}
        </div>
      ))}
      <div className="tiny muted mt">Las propuestas usan cantidades realistas y valores de referencia; no buscan cuadrar la cifra exacta.</div>
    </div>
  );
}
