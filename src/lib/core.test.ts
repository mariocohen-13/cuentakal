import { beforeEach, describe, expect, it } from 'vitest';
import { addDays, toKey, weekStart, weekdayIndex } from './date';
import { estimateDish } from './estimate';
import { buildWeekMenu, parseMenuText } from './menuParser';
import { planRest } from './planner';
import { builtinFood, perUnitFor, searchFoods, BUILTIN_FOODS } from './foods';
import { entryMacros, kcalFromMacros } from './macros';
import { defaultState, loadState, saveState, STORAGE_KEY } from './store';
import { parseBackup, serializeBackup } from './backup';
import { dayStatus, weekSummary } from './stats';
import type { AppState, LogEntry } from './types';

describe('fechas', () => {
  it('usa la fecha local y semanas de lunes a domingo', () => {
    expect(toKey(new Date(2026, 9, 19, 23, 59))).toBe('2026-10-19');
    expect(weekdayIndex('2026-10-19')).toBe(0); // lunes
    expect(weekStart('2026-10-25')).toBe('2026-10-19'); // domingo → lunes anterior
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });
});

describe('cálculo de macros', () => {
  it('calcula por gramos y por unidades', () => {
    const huevo = builtinFood('huevo');
    const per = perUnitFor(huevo, 'ud');
    expect(per.kcal).toBeCloseTo(143 * 0.6);
    const m = entryMacros({ perUnit: perUnitFor(builtinFood('arroz-crudo'), 'base'), qty: 70 });
    expect(m.kcal).toBeCloseTo(248.5);
    expect(m.carbs).toBeCloseTo(54.6);
  });
  it('los valores de referencia son coherentes (4/4/9)', () => {
    for (const f of BUILTIN_FOODS) {
      const d = kcalFromMacros(f.macros);
      if (f.macros.kcal < 30 || ["b:cerveza", "b:vino-tinto"].includes(f.id)) continue; // alcohol: 7 kcal/g
      // margen por fibra, alcohol y redondeos
      expect(Math.abs(d - f.macros.kcal) / f.macros.kcal, f.name).toBeLessThan(0.25);
    }
  });
  it('busca sin acentos', () => {
    expect(searchFoods(BUILTIN_FOODS, 'platano')[0].name).toBe('Plátano');
    expect(searchFoods(BUILTIN_FOODS, 'pollo crud')[0].id).toBe('b:pollo-crudo');
  });
});

describe('estimación de platos', () => {
  it('reconoce tipos de plato y los marca', () => {
    expect(estimateDish('Lentejas estofadas').label).toBe('legumbre guisada');
    expect(estimateDish('Merluza a la romana').label).toBe('rebozado / frito');
    expect(estimateDish('Tortilla de patatas').label).toBe('tortilla');
    expect(estimateDish('Ensalada de pasta').label).toBe('ensalada completa');
    expect(estimateDish('Arroz con leche').label).toBe('postre lácteo');
    expect(estimateDish('Lasaña de carne').label).toBe('lasaña / canelones');
    expect(estimateDish('Fruta del tiempo').label).toBe('pieza de fruta');
    expect(estimateDish('Xyzzy especial').generic).toBe(true);
    const conPatatas = estimateDish('Pollo asado con patatas');
    expect(conPatatas.label).toBe('pollo / pavo + guarnición de patata');
    expect(conPatatas.macros.kcal).toBeGreaterThan(estimateDish('Pollo asado').macros.kcal);
  });
});

describe('parser del menú', () => {
  it('formato día + comida: platos separados por /', () => {
    const { days } = parseMenuText(`MENÚ SEMANA 20-24 OCTUBRE
LUNES 20
Comida: Lentejas estofadas / Pollo asado con patatas / Fruta
Cena: Crema de calabacín; Tortilla de patata; Yogur
MARTES
Comida:
- Macarrones con tomate
- Merluza a la romana
Postre: Natillas
Cena: Ensalada mixta / Hamburguesa con pimientos`);
    expect(days[0].comida).toEqual(['Lentejas estofadas', 'Pollo asado con patatas', 'Fruta']);
    expect(days[0].cena).toEqual(['Crema de calabacín', 'Tortilla de patata', 'Yogur']);
    expect(days[1].comida).toEqual(['Macarrones con tomate', 'Merluza a la romana', 'Natillas']);
    expect(days[1].cena).toHaveLength(2);
  });
  it('formato comida primero y luego días, con comas en línea', () => {
    const { days } = parseMenuText(`COMIDAS
Lunes: Sopa de fideos, Filete de ternera, Flan
Miércoles - Paella mixta / Pescado al horno
CENAS
Lunes: Puré de verduras, Huevos revueltos`);
    expect(days[0].comida).toEqual(['Sopa de fideos', 'Filete de ternera', 'Flan']);
    expect(days[2].comida).toEqual(['Paella mixta', 'Pescado al horno']);
    expect(days[0].cena).toEqual(['Puré de verduras', 'Huevos revueltos']);
  });
  it('quita prefijos de plato y avisa si no hay días', () => {
    const { days } = parseMenuText('Viernes\n1º: Gazpacho\n2º: Salmón a la plancha\nPostre: Helado');
    expect(days[4].comida).toEqual(['Gazpacho', 'Salmón a la plancha', 'Helado']);
    expect(parseMenuText('Lentejas').warnings.length).toBeGreaterThan(0);
  });
  it('usa las correcciones guardadas de la biblioteca', () => {
    const { days } = parseMenuText('Lunes\nComida: Lentejas estofadas / Pollo asado');
    const lib = { 'lentejas estofadas': { name: 'Lentejas estofadas', macros: { kcal: 420, protein: 22, carbs: 55, fat: 11 }, accuracy: 'known' as const, updatedAt: 0 } };
    const w = buildWeekMenu(days, '2026-10-19', lib);
    expect(w.days[0].comida[0].macros.kcal).toBe(420);
    expect(w.days[0].comida[0].accuracy).toBe('known');
    expect(w.days[0].comida[1].accuracy).toBe('estimate');
  });
});

describe('planificador', () => {
  const goals = { kcal: 2200, protein: 140, carbs: 250, fat: 70 };
  it('propone merienda y cena con cantidades realistas', () => {
    const r = planRest({ goals, consumed: { kcal: 1200, protein: 70, carbs: 140, fat: 40 }, meriendaDone: false, cenaDone: false });
    expect(r.pending).toEqual(['merienda', 'cena']);
    const merienda = r.options.merienda![0];
    const cena = r.options.cena![0];
    expect(merienda.totals.kcal).toBeGreaterThan(150);
    expect(merienda.totals.kcal).toBeLessThan(500);
    expect(cena.totals.kcal).toBeGreaterThan(450);
    expect(cena.totals.kcal).toBeLessThan(900);
    for (const o of [...r.options.merienda!, ...r.options.cena!]) {
      for (const it of o.items) {
        if (it.unit !== 'ud') expect(it.qty).toBeLessThanOrEqual(300);
        else expect(it.qty).toBeLessThanOrEqual(4);
      }
    }
  });
  it('no fuerza nada si ya se ha llegado al objetivo', () => {
    const r = planRest({ goals, consumed: { kcal: 2300, protein: 150, carbs: 260, fat: 80 }, meriendaDone: false, cenaDone: false });
    expect(r.pending).toEqual([]);
    expect(r.message).toMatch(/superas/);
  });
  it('avisa cuando falta mucha proteína en lugar de forzar cantidades', () => {
    const r = planRest({ goals: { ...goals, protein: 220 }, consumed: { kcal: 1500, protein: 40, carbs: 200, fat: 50 }, meriendaDone: true, cenaDone: false });
    expect(r.notes.some((n) => n.includes('proteína'))).toBe(true);
  });
  it('puede proponer la cena del colegio', () => {
    const cenaMenu = buildWeekMenu(parseMenuText('Lunes\nCena: Crema de verduras / Pollo asado / Yogur').days, '2026-10-19', {}).days[0].cena;
    const r = planRest({ goals, consumed: { kcal: 1500, protein: 90, carbs: 180, fat: 50 }, meriendaDone: true, cenaDone: false, cenaMenu });
    expect(r.options.cena![0].fromMenu).toBe(true);
    expect(r.options.cena![0].menuDishes!.length).toBeGreaterThan(0);
  });
});

function entry(date: string, kcal: number): LogEntry {
  return { id: date + kcal, date, meal: 'comida', name: 'x', qty: 1, unit: 'racion', perUnit: { kcal, protein: 0, carbs: 0, fat: 0 }, accuracy: 'known', createdAt: 1 };
}

describe('historial', () => {
  it('distingue sin registrar, incompleto y bajo, y no cuenta días vacíos en la media', () => {
    const s: AppState = { ...defaultState(), entries: [entry('2026-10-19', 2200), entry('2026-10-20', 800), entry('2026-10-21', 800)], closedDays: ['2026-10-21'] };
    expect(dayStatus(s, '2026-10-19')).toBe('ok');
    expect(dayStatus(s, '2026-10-20')).toBe('partial');
    expect(dayStatus(s, '2026-10-21')).toBe('low');
    expect(dayStatus(s, '2026-10-22')).toBe('empty');
    const w = weekSummary(s, '2026-10-22');
    expect(w.daysLogged).toBe(3);
    expect(w.avg.kcal).toBeCloseTo(3800 / 3);
  });
});

describe('persistencia y copias de seguridad', () => {
  beforeEach(() => localStorage.clear());
  it('guarda y vuelve a cargar los datos', () => {
    const s: AppState = { ...defaultState(), goals: { kcal: 2500, protein: 160, carbs: 280, fat: 80 }, entries: [entry('2026-10-19', 500)] };
    expect(saveState(s, localStorage).ok).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
    const loaded = loadState(localStorage);
    expect(loaded.goals.kcal).toBe(2500);
    expect(loaded.entries).toHaveLength(1);
  });
  it('estado por defecto si no hay datos; conserva datos dañados aparte', () => {
    expect(loadState(localStorage).entries).toEqual([]);
    localStorage.setItem(STORAGE_KEY, '{roto');
    expect(loadState(localStorage).version).toBe(1);
    expect(Object.keys(localStorage).some((k) => k.includes(':corrupt:'))).toBe(true);
  });
  it('exporta e importa sin pérdidas y rechaza archivos inválidos', () => {
    const s: AppState = { ...defaultState(), entries: [entry('2026-10-19', 500)], weights: [{ date: '2026-10-19', kg: 72.4 }] };
    const back = parseBackup(serializeBackup(s));
    expect(back).toEqual(s);
    expect(() => parseBackup('hola')).toThrow();
    expect(() => parseBackup('{"version":9}')).toThrow();
  });
  it('el store en memoria persiste tras setState', async () => {
    const store = await import('./store');
    const actions = await import('./actions');
    actions.addEntry({ date: '2026-10-19', meal: 'cena', name: 'Test', qty: 2, unit: 'ud', perUnit: { kcal: 100, protein: 5, carbs: 10, fat: 3 }, accuracy: 'known' });
    const reloaded = loadState(localStorage);
    expect(reloaded.entries.some((e) => e.name === 'Test' && e.qty === 2)).toBe(true);
    expect(store.getState().entries.length).toBe(reloaded.entries.length);
  });
});
