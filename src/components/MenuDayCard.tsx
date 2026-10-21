import { useState } from 'react';
import type { MenuDish, MenuSlot } from '../lib/types';
import { MENU_SLOTS } from '../lib/types';
import { useAppState } from '../lib/store';
import { addEntry } from '../lib/actions';
import { weekStart, weekdayIndex } from '../lib/date';
import { normalizeName } from '../lib/estimate';
import { fmt } from '../lib/macros';
import { AccuracyBadge, MacroTiles, NumInput, Sheet, toast } from './ui';

export function addDish(date: string, slot: MenuSlot, dish: MenuDish, factor: number) {
  addEntry({
    date, meal: slot, name: dish.name, qty: factor, unit: 'racion', perUnit: dish.macros,
    accuracy: dish.accuracy, dishKey: normalizeName(dish.name),
  });
}

export function MenuDayCard({ date, onOpenMenu }: { date: string; onOpenMenu: () => void }) {
  const s = useAppState();
  const menu = s.menus[weekStart(date)];
  const day = menu?.days[weekdayIndex(date)];
  const [custom, setCustom] = useState<{ slot: MenuSlot; dish: MenuDish } | null>(null);
  const slots = day ? MENU_SLOTS.filter((sl) => day[sl.key].length) : [];
  const [open, setOpen] = useState<MenuSlot | 'all'>('all');

  const eaten = (slot: MenuSlot, dish: MenuDish) =>
    s.entries.some((e) => e.date === date && e.meal === slot && e.dishKey === normalizeName(dish.name));

  return (
    <div className="card">
      <h2>Menú del colegio <span className="spacer" /><button className="btn ghost small" onClick={onOpenMenu}>{menu ? 'Ver semana' : 'Añadir menú'}</button></h2>
      {!menu && <div className="empty-state">No hay menú para esta semana. Pega el menú semanal en la pestaña <b>Menú</b>.</div>}
      {menu && !slots.length && <div className="empty-state">El menú no tiene platos para este día.</div>}
      {slots.length > 1 && (
        <div className="chips mb">
          <button className={`chip ${open === 'all' ? 'on' : ''}`} onClick={() => setOpen('all')}>Todo</button>
          {slots.map((sl) => <button key={sl.key} className={`chip ${open === sl.key ? 'on' : ''}`} onClick={() => setOpen(sl.key)}>{sl.label}</button>)}
        </div>
      )}
      {day && slots.filter((sl) => open === 'all' || open === sl.key).map((sl) => (
        <div key={sl.key}>
          <div className="slot-title">{sl.label}</div>
          {day[sl.key].map((dish) => {
            const done = eaten(sl.key, dish);
            return (
              <div className="dish" key={dish.id}>
                <div className="grow">
                  <div className="name">{done && <span style={{ color: 'var(--ok)' }}>✓ </span>}{dish.name}</div>
                  <div className="meta">≈ {fmt(dish.macros.kcal)} kcal · P {fmt(dish.macros.protein)} g <AccuracyBadge a={dish.accuracy} /></div>
                </div>
                <div className="portion-btns">
                  <button className="btn" title="Ración entera" onClick={() => { addDish(date, sl.key, dish, 1); toast(`${dish.name} (1 ración)`); }}>1</button>
                  <button className="btn" title="Media ración" onClick={() => { addDish(date, sl.key, dish, 0.5); toast(`${dish.name} (½ ración)`); }}>½</button>
                  <button className="btn" title="Cantidad personalizada" onClick={() => setCustom({ slot: sl.key, dish })}>…</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {custom && <CustomPortion date={date} slot={custom.slot} dish={custom.dish} onClose={() => setCustom(null)} />}
    </div>
  );
}

function CustomPortion({ date, slot, dish, onClose }: { date: string; slot: MenuSlot; dish: MenuDish; onClose: () => void }) {
  const [f, setF] = useState(1);
  return (
    <Sheet title={dish.name} onClose={onClose}>
      <div className="card">
        <label>Raciones (1 = ración normal del colegio)</label>
        <NumInput value={f} onChange={setF} autoFocus />
        <div className="chips mt">
          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((c) => <button key={c} className={`chip ${c === f ? 'on' : ''}`} onClick={() => setF(c)}>{c}</button>)}
        </div>
        {dish.accuracy === 'estimate' && <div className="notice mt">Valores estimados. Puedes corregirlos después tocando el registro.</div>}
      </div>
      <MacroTiles m={{ kcal: dish.macros.kcal * f, protein: dish.macros.protein * f, carbs: dish.macros.carbs * f, fat: dish.macros.fat * f }} />
      <button className="btn primary block mt" disabled={!(f > 0)} onClick={() => { addDish(date, slot, dish, f); toast('Añadido'); onClose(); }}>Añadir</button>
    </Sheet>
  );
}
