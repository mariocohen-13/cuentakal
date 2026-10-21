import { useRef, useState } from 'react';
import type { Food, Macros } from '../lib/types';
import { getSaveError, useAppState, defaultState } from '../lib/store';
import { deleteFood, deleteSavedMeal, forgetDish, importState, markBackup, saveFood, setGoals } from '../lib/actions';
import { downloadBackup, parseBackup } from '../lib/backup';
import { fmt, kcalFromMacros, r1 } from '../lib/macros';
import { NumInput, Sheet, toast } from '../components/ui';
import { MacroInputs } from '../components/AddFoodSheet';

export function SettingsView() {
  const s = useAppState();
  const [g, setG] = useState<Macros>(s.goals);
  const [editFood, setEditFood] = useState<Food | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const derived = kcalFromMacros(g);
  const dirty = JSON.stringify(g) !== JSON.stringify(s.goals);
  const saveErr = getSaveError();
  const size = new Blob([JSON.stringify(s)]).size;
  const daysSinceBackup = s.lastBackup ? Math.floor((Date.now() - s.lastBackup) / 86400000) : null;

  const onImport = async (f: File) => {
    try {
      const next = parseBackup(await f.text());
      const n = next.entries.length;
      if (!confirm(`La copia contiene ${n} registros y ${Object.keys(next.menus).length} menús.\n\nSe REEMPLAZARÁN todos los datos actuales. ¿Continuar?`)) return;
      // Copia de seguridad automática del estado actual antes de reemplazar
      try { localStorage.setItem(`cuentakal:antes-de-importar:${Date.now()}`, JSON.stringify(s)); } catch { /* sin espacio */ }
      importState(next);
      setG(next.goals);
      toast('Copia restaurada');
    } catch (e) {
      alert(`No se pudo importar: ${e instanceof Error ? e.message : e}`);
    }
  };

  return (
    <>
      <div className="topbar"><div><div className="sub">Objetivos y datos</div><h1>Ajustes</h1></div></div>

      {saveErr && <div className="notice error mb">No se pudieron guardar los últimos cambios: {saveErr}. Exporta una copia de seguridad.</div>}

      <div className="card">
        <h2>Mis objetivos diarios</h2>
        <label>Calorías (kcal)</label>
        <NumInput value={g.kcal} onChange={(kcal) => setG({ ...g, kcal })} />
        <div className="grid4 mt" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div><label>Proteínas (g)</label><NumInput value={g.protein} onChange={(protein) => setG({ ...g, protein })} /></div>
          <div><label>Carbohidratos (g)</label><NumInput value={g.carbs} onChange={(carbs) => setG({ ...g, carbs })} /></div>
          <div><label>Grasas (g)</label><NumInput value={g.fat} onChange={(fat) => setG({ ...g, fat })} /></div>
        </div>
        <div className="tiny muted mt">
          Tus macros suman {fmt(derived)} kcal
          {Math.abs(derived - g.kcal) > 60 && <> (difieren de {fmt(g.kcal)} kcal) <button className="btn ghost small" onClick={() => setG({ ...g, kcal: Math.round(derived) })}>Ajustar calorías a {fmt(derived)}</button></>}
        </div>
        <button className="btn primary block mt" disabled={!dirty || g.kcal <= 0} onClick={() => { setGoals(g); toast('Objetivos guardados'); }}>Guardar objetivos</button>
      </div>

      <div className="card">
        <h2>Copia de seguridad</h2>
        <div className="small muted mb">
          Tus datos se guardan solo en este navegador. Exporta una copia periódicamente (o antes de borrar datos del navegador) y guárdala donde quieras.
          {daysSinceBackup === null ? ' Aún no has hecho ninguna copia.' : ` Última copia: hace ${daysSinceBackup} día(s).`}
        </div>
        <div className="row wrap">
          <button className="btn primary" onClick={() => { markBackup(); downloadBackup({ ...s, lastBackup: Date.now() }); }}>Exportar copia (.json)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Importar copia…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
        </div>
        <div className="tiny muted mt">{s.entries.length} registros · {Object.keys(s.menus).length} menús · {s.foods.length} alimentos propios · {(size / 1024).toFixed(0)} KB</div>
      </div>

      <div className="card">
        <h2>Mis alimentos ({s.foods.length})</h2>
        {!s.foods.length && <div className="small muted">Los alimentos que crees aparecerán aquí.</div>}
        {s.foods.map((f) => (
          <div key={f.id} className="dish">
            <div className="grow" onClick={() => setEditFood(f)}>
              <div className="name">{f.name}</div>
              <div className="meta">{fmt(f.macros.kcal)} kcal {f.base === 'ud' ? 'por unidad' : `por 100 ${f.base}`} · P {r1(f.macros.protein)} · C {r1(f.macros.carbs)} · G {r1(f.macros.fat)} · {f.accuracy === 'estimate' ? 'estimación' : 'dato'}</div>
            </div>
            <button className="btn small" onClick={() => setEditFood(f)}>Editar</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Platos habituales ({s.savedMeals.length})</h2>
        {!s.savedMeals.length && <div className="small muted">Guarda una comida como habitual desde el resumen del día.</div>}
        {s.savedMeals.map((m) => (
          <div key={m.id} className="dish">
            <div className="grow"><div className="name">{m.name}</div><div className="meta">{m.items.map((i) => i.name).join(', ')}</div></div>
            <button className="btn small danger" onClick={() => confirm(`¿Eliminar «${m.name}»?`) && deleteSavedMeal(m.id)}>Eliminar</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Platos del colegio corregidos ({Object.keys(s.dishLibrary).length})</h2>
        <div className="small muted mb">Cuando corriges un plato, se recuerda para próximos menús.</div>
        {Object.entries(s.dishLibrary).map(([k, d]) => (
          <div key={k} className="dish">
            <div className="grow"><div className="name">{d.name}</div><div className="meta">{fmt(d.macros.kcal)} kcal · P {fmt(d.macros.protein)} · C {fmt(d.macros.carbs)} · G {fmt(d.macros.fat)} · {d.accuracy === 'estimate' ? 'estimación' : 'dato'}</div></div>
            <button className="btn small" onClick={() => forgetDish(k)}>Olvidar</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Zona peligrosa</h2>
        <button className="btn danger" onClick={() => {
          if (!confirm('¿Borrar TODOS los datos de la app? Exporta antes una copia si la quieres conservar.')) return;
          if (!confirm('Esta acción no se puede deshacer. ¿Seguro?')) return;
          importState(defaultState());
          setG(defaultState().goals);
          toast('Datos borrados');
        }}>Borrar todos los datos</button>
      </div>

      <div className="tiny muted" style={{ textAlign: 'center', padding: '8px 0 20px' }}>CuentaKal · uso personal · todo funciona sin conexión</div>

      {editFood && <FoodEditor food={editFood} onClose={() => setEditFood(null)} />}
    </>
  );
}

function FoodEditor({ food, onClose }: { food: Food; onClose: () => void }) {
  const [name, setName] = useState(food.name);
  const [m, setM] = useState(food.macros);
  return (
    <Sheet title="Editar alimento" onClose={onClose}>
      <div className="card">
        <label>Nombre</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <div className="small muted mt mb">Valores {food.base === 'ud' ? 'por unidad' : `por 100 ${food.base}`}. Los registros ya hechos no cambian.</div>
        <MacroInputs m={m} onChange={setM} />
      </div>
      <div className="row">
        <button className="btn danger" onClick={() => { if (confirm('¿Eliminar este alimento? Los registros ya hechos se conservan.')) { deleteFood(food.id); onClose(); } }}>Eliminar</button>
        <div className="grow" />
        <button className="btn primary" onClick={() => { saveFood({ ...food, name: name.trim() || food.name, macros: m }); toast('Guardado'); onClose(); }}>Guardar</button>
      </div>
    </Sheet>
  );
}
