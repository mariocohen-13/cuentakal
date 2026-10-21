import { useState } from 'react';
import type { Accuracy, LogEntry, Macros, MealKey } from '../lib/types';
import { MEALS } from '../lib/types';
import { deleteEntry, rememberDish, updateEntry } from '../lib/actions';
import { scale } from '../lib/macros';
import { MacroInputs } from './AddFoodSheet';
import { AccuracyBadge, MacroTiles, NumInput, Seg, Sheet, toast } from './ui';

export function unitText(e: Pick<LogEntry, 'qty' | 'unit' | 'unitLabel'>): string {
  const q = Number.isInteger(e.qty) ? e.qty : Math.round(e.qty * 100) / 100;
  if (e.unit === 'racion') {
    if (e.qty === 1) return '1 ración';
    if (e.qty === 0.5) return '½ ración';
    return `${q} raciones`;
  }
  if (e.unit === 'ud') return `${q} ${e.unitLabel ?? 'ud'}`;
  return `${q} ${e.unit}`;
}

export function EntrySheet({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
  const [qty, setQty] = useState(entry.qty);
  const [meal, setMeal] = useState<MealKey>(entry.meal);
  const [per, setPer] = useState<Macros>(entry.perUnit);
  const [accuracy, setAccuracy] = useState<Accuracy>(entry.accuracy);
  const [remember, setRemember] = useState(true);
  const editableMacros = entry.unit === 'racion';
  const isDish = !!entry.dishKey;

  const save = () => {
    updateEntry(entry.id, { qty, meal, perUnit: per, accuracy });
    if (isDish && remember && (per !== entry.perUnit || accuracy !== entry.accuracy)) {
      rememberDish({ id: '', name: entry.name, macros: per, accuracy, note: accuracy === 'known' ? 'Valores corregidos por ti.' : 'Estimación ajustada por ti.' });
    }
    toast('Guardado');
    onClose();
  };

  const chips = entry.unit === 'racion' ? [0.5, 0.75, 1, 1.5, 2] : entry.unit === 'ud' ? [0.5, 1, 2, 3] : [50, 100, 150, 200, 250];

  return (
    <Sheet title="Editar registro" onClose={onClose}>
      <div className="card">
        <h2>{entry.name} <AccuracyBadge a={accuracy} builtin={entry.foodId?.startsWith('b:')} /></h2>
        <label>Comida</label>
        <select value={meal} onChange={(e) => setMeal(e.target.value as MealKey)}>
          {MEALS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <div className="mt">
          <label>Cantidad ({entry.unit === 'racion' ? 'raciones' : entry.unit === 'ud' ? entry.unitLabel ?? 'unidades' : entry.unit})</label>
          <NumInput value={qty} onChange={setQty} autoFocus />
          <div className="chips mt">
            {chips.map((c) => <button key={c} className={`chip ${c === qty ? 'on' : ''}`} onClick={() => setQty(c)}>{c === 0.5 && entry.unit === 'racion' ? '½' : c}</button>)}
          </div>
        </div>
      </div>
      {editableMacros && (
        <div className="card">
          <h2>Valores por ración</h2>
          {accuracy === 'estimate' && <div className="notice mb">Son estimaciones. Si conoces los valores reales (o el plato era más grande/pequeño), corrígelos aquí.</div>}
          <MacroInputs m={per} onChange={setPer} />
          <div className="mt"><Seg value={accuracy} onChange={setAccuracy} options={[{ v: 'estimate', l: 'Estimación' }, { v: 'known', l: 'Dato conocido' }]} /></div>
          {isDish && (
            <label className="row mt" style={{ fontSize: 13, color: 'var(--text)' }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 'auto' }} />
              Recordar estos valores para este plato en próximos menús
            </label>
          )}
        </div>
      )}
      <MacroTiles m={scale(per, qty)} />
      <div className="row mt">
        <button className="btn danger" onClick={() => { deleteEntry(entry.id); toast('Eliminado'); onClose(); }}>Eliminar</button>
        <div className="grow" />
        <button className="btn primary" onClick={save} disabled={!(qty > 0)}>Guardar</button>
      </div>
    </Sheet>
  );
}
