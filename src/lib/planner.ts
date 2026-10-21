import type { Food, Macros, MenuDish } from './types';
import { builtinFood, perUnitFor } from './foods';
import { add, scale, sum, ZERO } from './macros';

type PlanMeal = 'merienda' | 'cena';

interface TemplateItem {
  food: string; // id builtin sin prefijo
  /** Cantidades permitidas: en g/ml de la base o en unidades si unit='ud'. */
  options: number[];
  unit?: 'ud';
}

interface Template {
  id: string;
  meal: PlanMeal;
  name: string;
  items: TemplateItem[];
  tip?: string;
}

const range = (a: number, b: number, step: number) => {
  const out: number[] = [];
  for (let x = a; x <= b + 1e-9; x += step) out.push(Math.round(x * 100) / 100);
  return out;
};

// Plantillas con cantidades realistas (mínimos y máximos razonables por ingrediente).
const TEMPLATES: Template[] = [
  // Meriendas
  { id: 'm-skyr', meal: 'merienda', name: 'Skyr con fruta y frutos secos', items: [
    { food: 'skyr', options: [150, 300] }, { food: 'platano', options: [0, 1], unit: 'ud' }, { food: 'almendras', options: [0, 10, 20] } ] },
  { id: 'm-tostada-pavo', meal: 'merienda', name: 'Tostadas integrales con pavo y tomate', items: [
    { food: 'pan-integral', options: [1, 2, 3], unit: 'ud' }, { food: 'fiambre-pavo', options: [30, 45, 60, 90] }, { food: 'tomate', options: [60] }, { food: 'aceite-oliva', options: [0, 5] } ] },
  { id: 'm-bocadillo', meal: 'merienda', name: 'Bocadillo de jamón serrano', items: [
    { food: 'pan-blanco', options: [60, 80, 100, 120] }, { food: 'jamon-serrano', options: [30, 45, 60] }, { food: 'tomate', options: [0, 40] } ] },
  { id: 'm-batido', meal: 'merienda', name: 'Batido de leche, plátano y proteína', items: [
    { food: 'leche-semi', options: [200, 250, 300] }, { food: 'platano', options: [1], unit: 'ud' }, { food: 'whey', options: [0, 1], unit: 'ud' } ],
    tip: 'Si no tomas proteína en polvo, elige la versión sin cacito.' },
  { id: 'm-fruta-nueces', meal: 'merienda', name: 'Fruta y un puñado de nueces', items: [
    { food: 'manzana', options: [1], unit: 'ud' }, { food: 'nueces', options: [0, 10, 15, 20, 30] } ] },
  { id: 'm-batido-avena', meal: 'merienda', name: 'Queso batido con avena y arándanos', items: [
    { food: 'queso-batido', options: [125, 250] }, { food: 'avena', options: [0, 20, 30, 40, 60] }, { food: 'arandanos', options: [0, 50, 80] } ] },
  { id: 'm-cacahuete', meal: 'merienda', name: 'Tostada con crema de cacahuete y plátano', items: [
    { food: 'pan-integral', options: [1, 2], unit: 'ud' }, { food: 'crema-cacahuete', options: [10, 15, 20, 30] }, { food: 'platano', options: [0, 1], unit: 'ud' } ] },
  { id: 'm-yogur', meal: 'merienda', name: 'Yogur natural con fruta', items: [
    { food: 'yogur-natural', options: [1, 2], unit: 'ud' }, { food: 'kiwi', options: [0, 1, 2], unit: 'ud' } ] },
  // Cenas
  { id: 'c-pollo-arroz', meal: 'cena', name: 'Pollo a la plancha con arroz y brócoli', items: [
    { food: 'pollo-crudo', options: range(100, 250, 25) }, { food: 'arroz-crudo', options: [0, 40, 60, 80, 100] }, { food: 'brocoli', options: [150] }, { food: 'aceite-oliva', options: [5, 10] } ],
    tip: 'Pesos de pollo y arroz en crudo.' },
  { id: 'c-tortilla', meal: 'cena', name: 'Tortilla francesa con ensalada y pan', items: [
    { food: 'huevo', options: [2, 3, 4], unit: 'ud' }, { food: 'lechuga', options: [80] }, { food: 'tomate', options: [120] }, { food: 'pan-integral', options: [0, 1, 2], unit: 'ud' }, { food: 'aceite-oliva', options: [5, 10] } ] },
  { id: 'c-salmon', meal: 'cena', name: 'Salmón al horno con patata y ensalada', items: [
    { food: 'salmon', options: range(100, 200, 25) }, { food: 'patata-cocida', options: [0, 100, 150, 200, 250, 300] }, { food: 'lechuga', options: [80] }, { food: 'aceite-oliva', options: [0, 5] } ] },
  { id: 'c-merluza', meal: 'cena', name: 'Merluza con patata y judías verdes', items: [
    { food: 'merluza', options: range(150, 300, 50) }, { food: 'patata-cocida', options: [0, 100, 150, 200, 250, 300] }, { food: 'judias-verdes', options: [150] }, { food: 'aceite-oliva', options: [5, 10] } ] },
  { id: 'c-pasta-atun', meal: 'cena', name: 'Pasta con atún y tomate', items: [
    { food: 'pasta-cruda', options: range(50, 120, 10) }, { food: 'atun-natural', options: [1, 2], unit: 'ud' }, { food: 'tomate-frito', options: [50, 75, 100] } ],
    tip: 'Peso de la pasta en crudo.' },
  { id: 'c-wrap', meal: 'cena', name: 'Wrap de pollo con verduras', items: [
    { food: 'tortilla-trigo', options: [1, 2], unit: 'ud' }, { food: 'pollo-cocinado', options: range(60, 180, 20) }, { food: 'lechuga', options: [40] }, { food: 'tomate', options: [60] }, { food: 'queso-semicurado', options: [0, 20] } ] },
  { id: 'c-revuelto', meal: 'cena', name: 'Revuelto de huevo y champiñones con jamón y pan', items: [
    { food: 'huevo', options: [2, 3], unit: 'ud' }, { food: 'champinones', options: [100] }, { food: 'jamon-serrano', options: [0, 30, 45] }, { food: 'pan-blanco', options: [0, 30, 60] }, { food: 'aceite-oliva', options: [5] } ] },
  { id: 'c-garbanzos', meal: 'cena', name: 'Ensalada de garbanzos con atún', items: [
    { food: 'garbanzos-cocidos', options: [100, 150, 200, 250] }, { food: 'atun-natural', options: [1, 2], unit: 'ud' }, { food: 'tomate', options: [120] }, { food: 'pimiento', options: [50] }, { food: 'aceite-oliva', options: [5, 10] } ] },
  { id: 'c-ligera', meal: 'cena', name: 'Cena ligera: crema de verduras casera y yogur', items: [
    { food: 'calabacin', options: [200, 300] }, { food: 'patata-cocida', options: [0, 100] }, { food: 'aceite-oliva', options: [5] }, { food: 'skyr', options: [0, 150] } ] },
];

export interface PlanItem {
  foodId: string;
  name: string;
  qty: number;
  unit: 'g' | 'ml' | 'ud';
  unitLabel?: string;
  perUnit: Macros;
}

export interface PlanOption {
  id: string;
  meal: PlanMeal;
  name: string;
  items: PlanItem[];
  totals: Macros;
  tip?: string;
  fromMenu?: boolean;
  menuDishes?: { dish: MenuDish; factor: number }[];
  score: number;
}

export interface PlanResult {
  remaining: Macros;
  pending: PlanMeal[];
  targets: Partial<Record<PlanMeal, Macros>>;
  options: Partial<Record<PlanMeal, PlanOption[]>>;
  message?: string;
  notes: string[];
}

function itemFor(food: Food, qty: number, ud: boolean): PlanItem {
  const useUd = ud || food.base === 'ud';
  return {
    foodId: food.id,
    name: food.name,
    qty,
    unit: useUd ? 'ud' : food.base === 'ml' ? 'ml' : 'g',
    unitLabel: useUd ? food.unitName : undefined,
    perUnit: perUnitFor(food, useUd ? 'ud' : 'base'),
  };
}

/** Error ponderado: kcal y proteína pesan más; pasarse penaliza algo más que quedarse corto. */
export function scoreAgainst(t: Macros, m: Macros): number {
  const rel = (v: number, target: number, floor: number) => (v - target) / Math.max(target, floor);
  const over = (v: number, target: number, floor: number) => Math.max(0, v - target * 1.08) / Math.max(target, floor);
  return (
    Math.abs(rel(m.kcal, t.kcal, 150)) * 1.0 +
    over(m.kcal, t.kcal, 150) * 1.0 +
    Math.abs(rel(m.protein, t.protein, 15)) * 0.7 +
    Math.abs(rel(m.carbs, t.carbs, 25)) * 0.25 +
    Math.abs(rel(m.fat, t.fat, 10)) * 0.25
  );
}

function best(template: Template, target: Macros): PlanOption {
  const foods = template.items.map((it) => builtinFood(it.food));
  let bestScore = Infinity;
  let bestCombo: number[] = template.items.map((it) => it.options[0]);
  const idx = template.items.map(() => 0);
  const per = template.items.map((it, i) => perUnitFor(foods[i], it.unit === 'ud' ? 'ud' : 'base'));
  // Enumeración completa (las plantillas son pequeñas: < 1.000 combinaciones)
  for (;;) {
    const combo = idx.map((k, i) => template.items[i].options[k]);
    const totals = sum(combo.map((q, i) => scale(per[i], q)));
    const s = scoreAgainst(target, totals);
    if (s < bestScore) {
      bestScore = s;
      bestCombo = combo;
    }
    let p = 0;
    while (p < idx.length) {
      idx[p]++;
      if (idx[p] < template.items[p].options.length) break;
      idx[p] = 0;
      p++;
    }
    if (p === idx.length) break;
  }
  const items = bestCombo
    .map((q, i) => (q > 0 ? itemFor(foods[i], q, template.items[i].unit === 'ud') : null))
    .filter((x): x is PlanItem => x !== null);
  const totals = sum(items.map((it) => scale(it.perUnit, it.qty)));
  return { id: template.id, meal: template.meal, name: template.name, items, totals, tip: template.tip, score: bestScore };
}

function menuOptions(dishes: MenuDish[], target: Macros): PlanOption[] {
  if (!dishes.length) return [];
  const factors = [0, 0.5, 1];
  const list = dishes.slice(0, 5);
  let bestScore = Infinity;
  let bestF: number[] = [];
  const idx = list.map(() => 0);
  for (;;) {
    const f = idx.map((k) => factors[k]);
    if (f.some((x) => x > 0)) {
      const totals = sum(list.map((d, i) => scale(d.macros, f[i])));
      const s = scoreAgainst(target, totals);
      if (s < bestScore) {
        bestScore = s;
        bestF = f;
      }
    }
    let p = 0;
    while (p < idx.length) {
      idx[p]++;
      if (idx[p] < factors.length) break;
      idx[p] = 0;
      p++;
    }
    if (p === idx.length) break;
  }
  if (!bestF.length) return [];
  const chosen = list.map((dish, i) => ({ dish, factor: bestF[i] })).filter((x) => x.factor > 0);
  const totals = sum(chosen.map((c) => scale(c.dish.macros, c.factor)));
  return [{ id: 'menu-cena', meal: 'cena', name: 'Cena del colegio', items: [], totals, fromMenu: true, menuDishes: chosen, score: bestScore,
    tip: chosen.some((c) => c.dish.accuracy === 'estimate') ? 'Incluye platos con valores estimados.' : undefined }];
}

export interface PlanInput {
  goals: Macros;
  consumed: Macros;
  meriendaDone: boolean;
  cenaDone: boolean;
  cenaMenu?: MenuDish[];
}

export function planRest(input: PlanInput): PlanResult {
  const { goals, consumed } = input;
  const remaining: Macros = {
    kcal: goals.kcal - consumed.kcal,
    protein: goals.protein - consumed.protein,
    carbs: goals.carbs - consumed.carbs,
    fat: goals.fat - consumed.fat,
  };
  const notes: string[] = [];
  let pending: PlanMeal[] = [];
  if (!input.meriendaDone) pending.push('merienda');
  if (!input.cenaDone) pending.push('cena');

  const base: PlanResult = { remaining, pending, targets: {}, options: {}, notes };
  if (!pending.length) return { ...base, message: 'Ya has registrado la merienda y la cena de hoy.' };
  if (remaining.kcal < 120) {
    return {
      ...base,
      pending: [],
      message: remaining.kcal < 0
        ? `Hoy ya superas tu objetivo en ${Math.round(-remaining.kcal)} kcal. Si tienes hambre, opta por algo muy ligero (fruta, yogur, verdura).`
        : 'Estás prácticamente en tu objetivo de calorías. Si te apetece algo, que sea ligero: una fruta o un yogur.',
    };
  }
  // Con poco margen no tiene sentido repartir en dos comidas
  if (pending.length === 2 && remaining.kcal < 450) {
    pending = ['cena'];
    notes.push('Te queda poco margen: mejor concentrarlo en la cena que repartirlo en dos tomas.');
  }

  const positive: Macros = {
    kcal: Math.max(0, remaining.kcal),
    protein: Math.max(0, remaining.protein),
    carbs: Math.max(0, remaining.carbs),
    fat: Math.max(0, remaining.fat),
  };
  const shares: Record<PlanMeal, number> = pending.length === 2 ? { merienda: 0.3, cena: 0.7 } : { merienda: 1, cena: 1 };
  const targets: Partial<Record<PlanMeal, Macros>> = {};
  const options: Partial<Record<PlanMeal, PlanOption[]>> = {};

  for (const meal of pending) {
    const t = scale(positive, shares[meal]);
    targets[meal] = t;
    const opts = TEMPLATES.filter((tp) => tp.meal === meal).map((tp) => best(tp, t));
    opts.sort((a, b) => a.score - b.score);
    // Si hay cena en el colegio, es la opción más práctica: va siempre primero
    const fromMenu = meal === 'cena' && input.cenaMenu?.length ? menuOptions(input.cenaMenu, t) : [];
    options[meal] = [...fromMenu, ...opts].slice(0, 3);
  }

  // Avisos realistas en lugar de forzar cantidades
  const maxProtein = (list: PlanOption[] = []) => list.reduce((b, o) => (o.totals.protein > b.protein ? o.totals : b), ZERO);
  const plannedBest = pending.reduce((acc, m) => add(acc, maxProtein(options[m])), ZERO);
  if (remaining.protein > 0 && plannedBest.protein < remaining.protein - 20) {
    notes.push(`Te faltan ${Math.round(remaining.protein)} g de proteína; con raciones normales llegarías a unos ${Math.round(plannedBest.protein)} g. Mejor quedarse algo corto que forzar cantidades.`);
  }
  if (remaining.fat < 0) notes.push('Ya has superado la grasa del día: las opciones priorizan alimentos magros.');
  if (remaining.carbs < 0) notes.push('Ya has superado los hidratos del día: las opciones llevan pocos hidratos.');

  return { ...base, pending, targets, options, notes };
}
