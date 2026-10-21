import type { DayMenu, DishInfo, MenuDish, MenuSlot, WeekMenu } from './types';
import { estimateDish, estimateNote, normalizeName } from './estimate';
import { uid } from './id';
import { convertTabTables } from './menuTable';

const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const SLOT_WORDS: Record<string, MenuSlot | 'skip'> = {
  desayuno: 'desayuno',
  desayunos: 'desayuno',
  comida: 'comida',
  comidas: 'comida',
  almuerzo: 'comida',
  almuerzos: 'comida',
  cena: 'cena',
  cenas: 'cena',
  merienda: 'skip',
  meriendas: 'skip',
};
const COURSE_PREFIX =
  /^(1(º|o|er)?|2(º|o)?|3(º|o)?|primero|primer plato|primeros|segundo|segundo plato|segundos|tercero|postre|postres|guarnicion|plato principal|principal|entrante|opcion [a-z0-9]+)\s*[:.\-–)]\s*/;

export interface ParsedMenu {
  days: DayMenu[];
  warnings: string[];
}

export function emptyDays(): DayMenu[] {
  return Array.from({ length: 7 }, () => ({ desayuno: [], comida: [], cena: [] }));
}

type NameDays = Record<MenuSlot, string[]>[];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function cleanDish(s: string): string {
  let t = s.trim().replace(/^[\s\-–•·*·>]+/, '').replace(/[\s.;,]+$/, '').trim();
  const n = norm(t);
  const m = n.match(COURSE_PREFIX);
  if (m) t = t.slice(m[0].length).trim();
  if (t.length < 2) return '';
  // Mayúscula inicial, resto como esté salvo que venga TODO EN MAYÚSCULAS
  if (t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t)) t = t.toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const IGNORE = /^(menu|menus|semana|pan y agua|pan, agua|agua|pan|bebida|alergenos|nota|observaciones)\b.*$/;

function splitDishes(rest: string, inline: boolean): string[] {
  let parts = rest.split(/\s*[\/;|•·]\s*|\s+[-–]\s+|\t+/);
  if (inline && parts.length === 1 && rest.includes(',')) parts = rest.split(/\s*,\s*/);
  return parts.map(cleanDish).filter((p) => p && !IGNORE.test(norm(p)));
}

/** Elimina una fecha del principio: "20", "20/10", "20 de octubre", "(20-10-2026)". */
function stripLeadingDate(s: string): string {
  return s
    .replace(/^[\s,.:\-–()]*(\d{1,2}([/.\-]\d{1,2}([/.\-]\d{2,4})?)?(\s+de\s+[a-záéíóú]+)?)?[\s,.:\-–()]*/i, '')
    .trim();
}

/**
 * Interpreta un menú pegado como texto. Admite, entre otros:
 *  - "LUNES" / "Comida: Lentejas / Pollo asado / Fruta" / "Cena: …"
 *  - "Lunes - Comida: Lentejas, Pollo, Fruta"
 *  - "COMIDAS" / "Lunes: …" / "Martes: …" / "CENAS" / "Lunes: …"
 *  - Un plato por línea debajo de cada cabecera.
 */
export function parseMenuText(text: string): { days: NameDays; warnings: string[] } {
  const days: NameDays = Array.from({ length: 7 }, () => ({ desayuno: [], comida: [], cena: [] }));
  const warnings: string[] = [];
  let day: number | null = null;
  let slot: MenuSlot | 'skip' | null = null;
  let orphan = 0;

  for (const rawLine of convertTabTables(text).split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;
    let inline = false;

    // ¿Empieza por día?
    const n1 = norm(line);
    const dm = n1.match(/^(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/);
    if (dm) {
      day = DAYS.indexOf(dm[1]);
      line = stripLeadingDate(line.slice(dm[0].length));
      inline = true;
    }
    // ¿Empieza (o sigue) por comida?
    const n2 = norm(line);
    const sm = n2.match(/^(desayunos?|comidas?|almuerzos?|cenas?|meriendas?)\b\s*[:.\-–]?\s*/);
    if (sm) {
      slot = SLOT_WORDS[sm[1]];
      line = line.slice(sm[0].length);
      inline = true;
    }
    if (!line.trim()) continue;
    if (IGNORE.test(norm(line))) continue;

    if (day === null) {
      orphan++;
      continue;
    }
    if (slot === 'skip') continue;
    const target = slot ?? 'comida';
    days[day][target].push(...splitDishes(line, inline));
  }

  if (orphan > 0) warnings.push(`${orphan} línea(s) antes del primer día se han ignorado.`);
  const total = days.reduce((a, d) => a + d.desayuno.length + d.comida.length + d.cena.length, 0);
  if (total === 0) warnings.push('No se ha reconocido ningún plato. Asegúrate de que aparezcan los días (Lunes, Martes…).');
  return { days, warnings };
}

export function makeDish(name: string, library: Record<string, DishInfo>): MenuDish {
  const known = library[normalizeName(name)];
  if (known) {
    return { id: uid(), name, macros: { ...known.macros }, accuracy: known.accuracy, note: known.note ?? 'Valores guardados por ti anteriormente.' };
  }
  const est = estimateDish(name);
  return { id: uid(), name, macros: est.macros, accuracy: 'estimate', note: estimateNote(est) };
}

export function buildWeekMenu(
  names: NameDays,
  weekStart: string,
  library: Record<string, DishInfo>,
  rawText?: string,
  image?: string,
): WeekMenu {
  const days: DayMenu[] = names.map((d) => ({
    desayuno: d.desayuno.map((n) => makeDish(n, library)),
    comida: d.comida.map((n) => makeDish(n, library)),
    cena: d.cena.map((n) => makeDish(n, library)),
  }));
  return { weekStart, days, rawText, image, updatedAt: Date.now() };
}

/** Texto editable a partir de un menú existente (para volver a editarlo como texto). */
export function menuToText(menu: WeekMenu): string {
  const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const out: string[] = [];
  menu.days.forEach((d, i) => {
    const slots = (['desayuno', 'comida', 'cena'] as MenuSlot[]).filter((s) => d[s].length);
    if (!slots.length) return;
    out.push(names[i].toUpperCase());
    for (const s of slots) out.push(`${s.charAt(0).toUpperCase() + s.slice(1)}: ${d[s].map((x) => x.name).join(' / ')}`);
    out.push('');
  });
  return out.join('\n').trim();
}
