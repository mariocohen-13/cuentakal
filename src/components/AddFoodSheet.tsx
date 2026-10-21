import { useMemo, useState } from 'react';
import type { Accuracy, BaseUnit, Food, Macros, MealKey } from '../lib/types';
import { MEALS } from '../lib/types';
import { useAppState } from '../lib/store';
import { addEntries, addEntry, saveFood, toggleFavorite } from '../lib/actions';
import { allFoods, perUnitFor, searchFoods } from '../lib/foods';
import { fmt, kcalFromMacros, r1, scale, sum } from '../lib/macros';
import { uid } from '../lib/id';
import { AccuracyBadge, Icon, MacroTiles, NumInput, Seg, Sheet, toast } from './ui';

type Tab = 'buscar' | 'habituales' | 'nuevo' | 'rapido';

export function AddFoodSheet({ date, meal: initialMeal, onClose }: { date: string; meal: MealKey; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('buscar');
  const [meal, setMeal] = useState<MealKey>(initialMeal);
  const [selected, setSelected] = useState<Food | null>(null);

  return (
    <Sheet title={`Añadir a ${MEALS.find((m) => m.key === meal)?.label.toLowerCase()}`} onClose={onClose}>
      <div className="mb">
        <select value={meal} onChange={(e) => setMeal(e.target.value as MealKey)} aria-label="Comida">
          {MEALS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </div>
      {selected ? (
        <QuantityPanel food={selected} date={date} meal={meal} onBack={() => setSelected(null)} onDone={onClose} />
      ) : (
        <>
          <Seg value={tab} onChange={setTab} options={[
            { v: 'buscar', l: 'Buscar' }, { v: 'habituales', l: 'Habituales' }, { v: 'nuevo', l: 'Nuevo' }, { v: 'rapido', l: 'Rápido' },
          ]} />
          <div className="mt">
            {tab === 'buscar' && <SearchPanel onPick={setSelected} />}
            {tab === 'habituales' && <SavedMealsPanel date={date} meal={meal} onDone={onClose} />}
            {tab === 'nuevo' && <NewFoodForm onSaved={setSelected} />}
            {tab === 'rapido' && <QuickAdd date={date} meal={meal} onDone={onClose} />}
          </div>
        </>
      )}
    </Sheet>
  );
}

function FoodRow({ f, onPick, fav }: { f: Food; onPick: (f: Food) => void; fav: boolean }) {
  const per = f.base === 'ud' ? `por ${f.unitName ?? 'unidad'}` : `por 100 ${f.base}`;
  return (
    <button className="list-item" onClick={() => onPick(f)}>
      <div className="grow">
        <div>{f.name} {fav && <span style={{ color: 'var(--carbs)' }}>★</span>}</div>
        <div className="meta">{fmt(f.macros.kcal)} kcal {per} · P {r1(f.macros.protein)} · C {r1(f.macros.carbs)} · G {r1(f.macros.fat)}</div>
      </div>
      <AccuracyBadge a={f.accuracy} builtin={f.builtin} />
    </button>
  );
}

function SearchPanel({ onPick }: { onPick: (f: Food) => void }) {
  const s = useAppState();
  const [q, setQ] = useState('');
  const foods = useMemo(() => allFoods(s.foods), [s.foods]);
  const recents = useMemo(() => {
    const seen = new Set<string>();
    const out: Food[] = [];
    for (const e of [...s.entries].sort((a, b) => b.createdAt - a.createdAt)) {
      if (!e.foodId || seen.has(e.foodId)) continue;
      seen.add(e.foodId);
      const f = foods.find((x) => x.id === e.foodId);
      if (f) out.push(f);
      if (out.length >= 8) break;
    }
    return out;
  }, [s.entries, foods]);
  const favs = foods.filter((f) => s.favorites.includes(f.id));
  const results = q.trim() ? searchFoods(foods, q, s.favorites).slice(0, 40) : [];

  return (
    <>
      <input autoFocus placeholder="Buscar alimento (p. ej. yogur, pan, pollo)…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt">
        {q.trim() ? (
          results.length ? (
            <div className="list">{results.map((f) => <FoodRow key={f.id} f={f} onPick={onPick} fav={s.favorites.includes(f.id)} />)}</div>
          ) : (
            <div className="empty-state">No hay resultados. Créalo en la pestaña <b>Nuevo</b> o usa <b>Rápido</b>.</div>
          )
        ) : (
          <>
            {favs.length > 0 && <><div className="section-title">Favoritos</div><div className="list">{favs.map((f) => <FoodRow key={f.id} f={f} onPick={onPick} fav />)}</div></>}
            {recents.length > 0 && <><div className="section-title">Recientes</div><div className="list">{recents.map((f) => <FoodRow key={f.id} f={f} onPick={onPick} fav={s.favorites.includes(f.id)} />)}</div></>}
            {!favs.length && !recents.length && <div className="empty-state">Escribe para buscar entre {foods.length} alimentos. Marca con ★ los que uses a menudo.</div>}
          </>
        )}
      </div>
    </>
  );
}

function QuantityPanel({ food, date, meal, onBack, onDone }: { food: Food; date: string; meal: MealKey; onBack: () => void; onDone: () => void }) {
  const s = useAppState();
  const canUnit = food.base === 'ud' || !!food.unitSize;
  const startUd = food.base === 'ud' || (!!food.unitSize && food.defaultQty === food.unitSize);
  const [mode, setMode] = useState<'base' | 'ud'>(startUd ? 'ud' : 'base');
  const [qty, setQty] = useState<number>(startUd ? 1 : food.defaultQty ?? 100);
  const per = perUnitFor(food, mode);
  const total = scale(per, qty);
  const baseLabel = food.base === 'ml' ? 'ml' : 'g';
  const unitLabel = food.unitName ?? 'unidad';
  const fav = s.favorites.includes(food.id);

  const switchMode = (m: 'base' | 'ud') => {
    if (m === mode) return;
    if (food.unitSize) setQty(m === 'ud' ? Math.max(1, Math.round((qty / food.unitSize) * 2) / 2) : Math.round(qty * food.unitSize));
    setMode(m);
  };
  const chips = mode === 'ud' ? [0.5, 1, 2, 3] : food.base === 'ml' ? [100, 200, 250, 330] : [30, 50, 100, 150, 200];

  const add = () => {
    if (!(qty > 0)) return;
    addEntry({
      date, meal, name: food.name, qty, unit: mode === 'ud' ? 'ud' : food.base === 'ml' ? 'ml' : 'g',
      unitLabel: mode === 'ud' ? unitLabel : undefined, perUnit: per, accuracy: food.accuracy, foodId: food.id,
    });
    toast(`${food.name} añadido`);
    onDone();
  };

  return (
    <div>
      <div className="row mb">
        <button className="btn ghost" onClick={onBack}><Icon.left /> Volver</button>
        <div className="grow" />
        <button className="icon-btn" onClick={() => toggleFavorite(food.id)} aria-label="Favorito" style={{ color: fav ? 'var(--carbs)' : undefined }}>
          <Icon.star on={fav} />
        </button>
      </div>
      <div className="card">
        <h2>{food.name} <AccuracyBadge a={food.accuracy} builtin={food.builtin} /></h2>
        {food.source && <div className="tiny muted mb">{food.source}</div>}
        {food.base !== 'ud' && canUnit && (
          <div className="mb">
            <Seg value={mode} onChange={switchMode} options={[{ v: 'base', l: baseLabel }, { v: 'ud', l: `${unitLabel} (${food.unitSize} ${baseLabel})` }]} />
          </div>
        )}
        <label htmlFor="qty">Cantidad ({mode === 'ud' ? unitLabel : baseLabel})</label>
        <NumInput id="qty" value={qty} onChange={setQty} autoFocus />
        <div className="chips mt">
          {chips.map((c) => <button key={c} className={`chip ${c === qty ? 'on' : ''}`} onClick={() => setQty(c)}>{c} {mode === 'ud' ? '' : baseLabel}</button>)}
        </div>
      </div>
      <MacroTiles m={total} />
      <button className="btn primary block mt" onClick={add} disabled={!(qty > 0)}>Añadir</button>
    </div>
  );
}

function SavedMealsPanel({ date, meal, onDone }: { date: string; meal: MealKey; onDone: () => void }) {
  const s = useAppState();
  if (!s.savedMeals.length) {
    return <div className="empty-state">Aún no tienes platos habituales. En el resumen del día, pulsa <b>Guardar como habitual</b> en cualquier comida para reutilizarla con un clic.</div>;
  }
  return (
    <div className="list">
      {s.savedMeals.map((m) => {
        const tot = sum(m.items.map((i) => scale(i.perUnit, i.qty)));
        const est = m.items.some((i) => i.accuracy === 'estimate');
        return (
          <button key={m.id} className="list-item" onClick={() => {
            addEntries(m.items.map((i) => ({ ...i, date, meal })));
            toast(`${m.name} añadido`);
            onDone();
          }}>
            <div className="grow">
              <div>{m.name}</div>
              <div className="meta">{m.items.map((i) => i.name).join(', ')}</div>
              <div className="meta">{fmt(tot.kcal)} kcal · P {r1(tot.protein)} · C {r1(tot.carbs)} · G {r1(tot.fat)}</div>
            </div>
            {est && <span className="badge estimate">Incl. estim.</span>}
          </button>
        );
      })}
    </div>
  );
}

export function MacroInputs({ m, onChange }: { m: Macros; onChange: (m: Macros) => void }) {
  const derived = kcalFromMacros(m);
  return (
    <>
      <div className="grid4">
        <div><label>kcal</label><NumInput value={m.kcal} onChange={(kcal) => onChange({ ...m, kcal })} /></div>
        <div><label>Proteína g</label><NumInput value={m.protein} onChange={(protein) => onChange({ ...m, protein })} /></div>
        <div><label>Hidratos g</label><NumInput value={m.carbs} onChange={(carbs) => onChange({ ...m, carbs })} /></div>
        <div><label>Grasa g</label><NumInput value={m.fat} onChange={(fat) => onChange({ ...m, fat })} /></div>
      </div>
      {derived > 0 && Math.abs(derived - m.kcal) > Math.max(25, m.kcal * 0.15) && (
        <div className="tiny muted mt">Los macros suman ≈ {fmt(derived)} kcal. <button className="btn ghost small" onClick={() => onChange({ ...m, kcal: Math.round(derived) })}>Usar ese valor</button></div>
      )}
    </>
  );
}

function NewFoodForm({ onSaved }: { onSaved: (f: Food) => void }) {
  const [name, setName] = useState('');
  const [base, setBase] = useState<BaseUnit>('g');
  const [m, setM] = useState<Macros>({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const [unitName, setUnitName] = useState('');
  const [unitSize, setUnitSize] = useState(0);
  const [accuracy, setAccuracy] = useState<Accuracy>('known');

  const save = () => {
    const food: Food = {
      id: `c:${uid()}`, name: name.trim(), base, macros: m, accuracy,
      unitName: base === 'ud' ? unitName.trim() || 'unidad' : unitSize > 0 ? unitName.trim() || 'unidad' : undefined,
      unitSize: base !== 'ud' && unitSize > 0 ? unitSize : undefined,
      defaultQty: base === 'ud' ? 1 : unitSize > 0 ? unitSize : 100,
      source: accuracy === 'known' ? 'Creado por ti (dato de etiqueta)' : 'Creado por ti (estimación)',
    };
    saveFood(food);
    toast('Alimento guardado');
    onSaved(food);
  };

  return (
    <div className="card">
      <label>Nombre</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="p. ej. Yogur proteico marca X" />
      <div className="mt"><label>Los valores son…</label>
        <Seg value={base} onChange={setBase} options={[{ v: 'g', l: 'por 100 g' }, { v: 'ml', l: 'por 100 ml' }, { v: 'ud', l: 'por unidad' }]} />
      </div>
      <div className="mt"><MacroInputs m={m} onChange={setM} /></div>
      <div className="grid2 mt">
        <div><label>Nombre de la unidad (opcional)</label><input value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="tarrina, rebanada…" /></div>
        {base !== 'ud' && <div><label>Peso de 1 unidad ({base})</label><NumInput value={unitSize} onChange={setUnitSize} /></div>}
      </div>
      <div className="mt"><label>Origen del dato</label>
        <Seg value={accuracy} onChange={setAccuracy} options={[{ v: 'known', l: 'Etiqueta / dato conocido' }, { v: 'estimate', l: 'Estimación' }]} />
      </div>
      <button className="btn primary block mt" disabled={!name.trim() || m.kcal <= 0} onClick={save}>Guardar y continuar</button>
    </div>
  );
}

function QuickAdd({ date, meal, onDone }: { date: string; meal: MealKey; onDone: () => void }) {
  const [name, setName] = useState('');
  const [m, setM] = useState<Macros>({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const [accuracy, setAccuracy] = useState<Accuracy>('estimate');
  return (
    <div className="card">
      <div className="small muted mb">Para registrar algo sin crear un alimento (p. ej. una comida fuera de casa).</div>
      <label>Descripción</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="p. ej. Menú del día en bar" />
      <div className="mt"><MacroInputs m={m} onChange={setM} /></div>
      <div className="mt"><Seg value={accuracy} onChange={setAccuracy} options={[{ v: 'estimate', l: 'Estimación' }, { v: 'known', l: 'Dato conocido' }]} /></div>
      <button className="btn primary block mt" disabled={m.kcal <= 0} onClick={() => {
        addEntry({ date, meal, name: name.trim() || 'Entrada rápida', qty: 1, unit: 'racion', perUnit: m, accuracy });
        toast('Añadido');
        onDone();
      }}>Añadir</button>
    </div>
  );
}
