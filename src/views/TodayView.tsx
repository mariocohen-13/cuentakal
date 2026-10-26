import { useState } from 'react';
import type { LogEntry } from '../lib/types';
import { useAppState } from '../lib/store';
import { saveMeal } from '../lib/actions';
import { addDays, formatLong, formatShort, todayKey } from '../lib/date';
import { dayTotals, entriesFor, dayStatus, STATUS_LABEL } from '../lib/stats';
import { entryMacros, fmt, r1 } from '../lib/macros';
import { uid } from '../lib/id';
import { AccuracyBadge, Icon, MacroBar, Ring, toast } from '../components/ui';
import { AddFoodSheet } from '../components/AddFoodSheet';
import { EntrySheet, unitText } from '../components/EntrySheet';
import { MenuDayCard } from '../components/MenuDayCard';

export function TodayView({ date, setDate, goMenu }: { date: string; setDate: (d: string) => void; goMenu: () => void }) {
  const s = useAppState();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LogEntry | null>(null);
  const list = entriesFor(s, date);
  const totals = dayTotals(list);
  const g = s.goals;
  const isToday = date === todayKey();
  const estKcal = list.filter((e) => e.accuracy === 'estimate').reduce((a, e) => a + entryMacros(e).kcal, 0);
  const status = dayStatus(s, date);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="sub">{isToday ? formatShort(date) : STATUS_LABEL[status]}</div>
          <h1>{formatLong(date)}</h1>
        </div>
        <div className="row">
          <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior"><Icon.left /></button>
          {!isToday && <button className="btn small" onClick={() => setDate(todayKey())}>Hoy</button>}
          <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Día siguiente"><Icon.right /></button>
        </div>
      </div>

      <div className="card">
        <div className="summary">
          <div className="ring-wrap">
            <Ring value={totals.kcal} goal={g.kcal} />
            <div className="ring-center">
              {g.kcal - totals.kcal >= 0 ? (
                <><div className="big num">{fmt(g.kcal - totals.kcal)}</div><div className="lbl">kcal restantes</div></>
              ) : (
                <><div className="big num" style={{ color: 'var(--danger)' }}>+{fmt(totals.kcal - g.kcal)}</div><div className="lbl">kcal por encima</div></>
              )}
            </div>
          </div>
          <div className="macros">
            <MacroBar k="kcal" value={totals.kcal} goal={g.kcal} unit="kcal" />
            <MacroBar k="protein" value={totals.protein} goal={g.protein} />
            <MacroBar k="carbs" value={totals.carbs} goal={g.carbs} />
            <MacroBar k="fat" value={totals.fat} goal={g.fat} />
          </div>
        </div>
        {estKcal > 0 && (
          <div className="tiny muted mt">
            <span className="badge estimate">Estimación</span> {fmt(estKcal)} de {fmt(totals.kcal)} kcal proceden de valores estimados.
          </div>
        )}
      </div>

      <div className="card meal">
        <div className="meal-head">
          <h3 className="grow">Lo que he comido</h3>
          {list.length > 0 && <span className="kc num">{fmt(totals.kcal)} kcal</span>}
          <button className="icon-btn" onClick={() => setAdding(true)} aria-label="Añadir alimento" style={{ color: 'var(--accent)' }}><Icon.plus /></button>
        </div>
        {list.length === 0 && <div className="empty-state">Añade alimentos con + o desde el menú del colegio.</div>}
        {list.map((e) => {
          const m = entryMacros(e);
          return (
            <button className="entry" key={e.id} onClick={() => setEditing(e)}>
              <div className="grow">
                <div className="name">{e.name}</div>
                <div className="meta">{unitText(e)} · P {r1(m.protein)} · C {r1(m.carbs)} · G {r1(m.fat)}</div>
              </div>
              {e.accuracy === 'estimate' && <AccuracyBadge a="estimate" />}
              <span className="kc">{fmt(m.kcal)}</span>
            </button>
          );
        })}
        {list.length > 0 && (
          <div className="meal-macros num">
            <button className="btn ghost small" style={{ padding: 0 }} onClick={() => {
              const name = prompt('Nombre para esta comida habitual:', 'Comida habitual');
              if (!name) return;
              saveMeal({ id: uid(), name, items: list.map(({ name, qty, unit, unitLabel, perUnit, accuracy, foodId, dishKey }) => ({ name, qty, unit, unitLabel, perUnit, accuracy, foodId, dishKey })) });
              toast('Guardado en habituales');
            }}>Guardar todo como habitual</button>
          </div>
        )}
      </div>

      <MenuDayCard date={date} onOpenMenu={goMenu} />

      {adding && <AddFoodSheet date={date} meal="otros" onClose={() => setAdding(false)} />}
      {editing && <EntrySheet entry={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
