import { useState } from 'react';
import type { Accuracy, Macros, MenuDish } from '../lib/types';
import { MacroInputs } from './AddFoodSheet';
import { Seg, Sheet } from './ui';
import { estimateDish, estimateNote } from '../lib/estimate';

/** Edita un plato del menú (nombre y valores por ración). */
export function DishSheet({ dish, onSave, onDelete, onClose }: {
  dish: MenuDish;
  onSave: (d: MenuDish, remember: boolean) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(dish.name);
  const [m, setM] = useState<Macros>(dish.macros);
  const [accuracy, setAccuracy] = useState<Accuracy>(dish.accuracy);
  const [note, setNote] = useState(dish.note ?? '');
  const [remember, setRemember] = useState(true);

  const reestimate = () => {
    const e = estimateDish(name);
    setM(e.macros);
    setAccuracy('estimate');
    setNote(estimateNote(e));
  };

  return (
    <Sheet title="Plato del menú" onClose={onClose}>
      <div className="card">
        <label>Nombre</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <div className="mt row">
          <div className="grow small muted">Valores por <b>ración completa</b> del colegio.</div>
          <button className="btn small" onClick={reestimate}>Re-estimar</button>
        </div>
        <div className="mt"><MacroInputs m={m} onChange={(v) => { setM(v); }} /></div>
        <div className="mt"><Seg value={accuracy} onChange={setAccuracy} options={[{ v: 'estimate', l: 'Estimación' }, { v: 'known', l: 'Dato conocido' }]} /></div>
        {note && <div className={`notice mt ${accuracy === 'known' ? 'info' : ''}`}>{note}</div>}
        <label className="row mt" style={{ fontSize: 13, color: 'var(--text)' }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 'auto' }} />
          Recordar estos valores para este plato en próximos menús
        </label>
      </div>
      <div className="row">
        {onDelete && <button className="btn danger" onClick={onDelete}>Quitar del menú</button>}
        <div className="grow" />
        <button className="btn primary" disabled={!name.trim()} onClick={() => {
          const changed = m !== dish.macros || accuracy !== dish.accuracy;
          onSave({ ...dish, name: name.trim(), macros: m, accuracy, note: changed ? (accuracy === 'known' ? 'Valores introducidos por ti.' : 'Estimación ajustada por ti.') : note }, remember);
        }}>Guardar</button>
      </div>
    </Sheet>
  );
}
