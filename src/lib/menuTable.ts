/**
 * Menús en forma de tabla (una columna por día). Convierte la tabla al formato de texto
 * que entiende parseMenuText: "LUNES\nComida: a / b\nCena: c".
 */
import type { MenuSlot } from './types';

const DAY_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DAY_TITLES = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
const SLOT_LABEL: Record<MenuSlot, string> = { desayuno: 'Desayuno', comida: 'Comida', cena: 'Cena' };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function dayOf(cell: string): number {
  const m = norm(cell).match(/^(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/);
  return m ? DAY_KEYS.indexOf(m[1]) : -1;
}

/** Detecta la comida en una etiqueta de fila ("COMIDA", "Cena - 1º plato"…). 'skip' = merienda. */
export function slotOf(label: string): MenuSlot | 'skip' | null {
  const n = norm(label);
  if (/\b(desayunos?)\b/.test(n)) return 'desayuno';
  if (/\b(comidas?|almuerzos?|mediodia)\b/.test(n)) return 'comida';
  if (/\b(cenas?|noche)\b/.test(n)) return 'cena';
  if (/\b(meriendas?)\b/.test(n)) return 'skip';
  return null;
}

/** Une con la línea anterior los nombres de plato partidos en dos líneas dentro de la celda. */
function isContinuation(prev: string | undefined, next: string): boolean {
  if (!prev) return false;
  if (/^[a-záéíóúñü(]/.test(next.trim())) return true;
  return /\b(con|de|del|y|a|al|la|en|e)$|[,(-]$/i.test(prev.trim());
}

export class TableBuilder {
  private days: Record<MenuSlot, string[]>[] = Array.from({ length: 7 }, () => ({ desayuno: [], comida: [], cena: [] }));
  private slot: MenuSlot | 'skip' = 'comida';
  private used = false;
  private lastRow: (number | null)[] = Array(7).fill(null);

  setLabel(label: string) {
    const s = slotOf(label);
    if (s && s !== this.slot) {
      this.slot = s;
      this.lastRow.fill(null);
    }
  }

  /** `row`: nº de fila (solo PDF) para unir un plato partido en dos líneas consecutivas. */
  add(day: number, text: string, row?: number) {
    const t = text.trim();
    if (!t || this.slot === 'skip' || day < 0) return;
    if (/^(pan|agua|pan y agua|-+|—)$/i.test(norm(t))) return;
    this.used = true;
    const list = this.days[day][this.slot];
    const adjacent = row !== undefined && this.lastRow[day] === row - 1;
    if (adjacent && isContinuation(list[list.length - 1], t)) list[list.length - 1] += ' ' + t;
    else list.push(t);
    this.lastRow[day] = row ?? null;
  }

  hasData() {
    return this.used;
  }

  toText(): string {
    const out: string[] = [];
    this.days.forEach((d, i) => {
      const slots = (['desayuno', 'comida', 'cena'] as MenuSlot[]).filter((s) => d[s].length);
      if (!slots.length) return;
      out.push(DAY_TITLES[i]);
      for (const s of slots) out.push(`${SLOT_LABEL[s]}: ${d[s].map((x) => x.replace(/\//g, '-')).join(' / ')}`);
    });
    return out.join('\n');
  }
}

/** Texto pegado desde una tabla (Excel, Word, web): columnas separadas por tabuladores. */
export function convertTabTables(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let cols: number[] | null = null; // índice de día por columna
  let offset = 0;
  let tb: TableBuilder | null = null;
  const flush = () => {
    if (tb?.hasData()) out.push(tb.toText());
    tb = null;
    cols = null;
  };
  for (const line of lines) {
    const cells = line.split('\t');
    const dayCells = cells.map(dayOf);
    if (cells.length >= 3 && dayCells.filter((d) => d >= 0).length >= 3) {
      flush();
      offset = dayCells.findIndex((d) => d >= 0);
      cols = dayCells.slice(offset);
      tb = new TableBuilder();
      tb.setLabel(cells.slice(0, offset).join(' '));
      continue;
    }
    if (!cols || !tb) {
      out.push(line);
      continue;
    }
    if (cells.length === 1) {
      // Línea suelta dentro de la tabla: puede ser "CENA" o un separador
      if (slotOf(line)) tb.setLabel(line);
      else if (line.trim()) { flush(); out.push(line); }
      continue;
    }
    tb.setLabel(cells.slice(0, offset).join(' '));
    cells.slice(offset).forEach((c, i) => {
      if (cols![i] !== undefined && cols![i] >= 0) tb!.add(cols![i], c);
    });
  }
  flush();
  return out.join('\n');
}

export interface Fragment { x: number; w: number; s: string }

/** Une fragmentos de un PDF cercanos en horizontal en celdas. */
export function toCells(parts: Fragment[], gap = 12): Fragment[] {
  const sorted = [...parts].sort((a, b) => a.x - b.x);
  const cells: Fragment[] = [];
  for (const p of sorted) {
    const last = cells[cells.length - 1];
    if (last && p.x - (last.x + last.w) <= gap) {
      last.s = `${last.s} ${p.s.trim()}`.trim();
      last.w = p.x + p.w - last.x;
    } else cells.push({ x: p.x, w: p.w, s: p.s.trim() });
  }
  return cells.filter((c) => c.s);
}

/**
 * Filas de un PDF (de arriba abajo). Si hay una cabecera con ≥3 días, asigna cada celda
 * al día cuya columna esté más cerca; lo que queda a la izquierda es la etiqueta de fila.
 * Devuelve null si no parece una tabla por días.
 */
export function pdfRowsToText(rows: Fragment[][]): string | null {
  const out: string[] = [];
  let centers: { day: number; c: number }[] | null = null;
  let labelLimit = 0;
  let tb: TableBuilder | null = null;
  let found = false;
  const flush = () => {
    if (tb?.hasData()) out.push(tb.toText());
    tb = null;
  };
  rows.forEach((row, rowIdx) => {
    const cells = toCells(row);
    const days = cells.map((c) => dayOf(c.s));
    if (days.filter((d) => d >= 0).length >= 3) {
      flush();
      found = true;
      centers = cells.map((c, i) => ({ day: days[i], c: c.x + c.w / 2 })).filter((x) => x.day >= 0);
      const step = centers.length > 1 ? (centers[centers.length - 1].c - centers[0].c) / (centers.length - 1) : 100;
      labelLimit = centers[0].c - step * 0.6;
      tb = new TableBuilder();
      cells.filter((c) => c.x + c.w / 2 < labelLimit).forEach((c) => tb!.setLabel(c.s));
      return;
    }
    if (!centers || !tb) {
      out.push(cells.map((c) => c.s).join(' / '));
      return;
    }
    const label = cells.filter((c) => c.x + c.w / 2 < labelLimit).map((c) => c.s).join(' ');
    if (label) tb.setLabel(label);
    for (const c of cells) {
      const mid = c.x + c.w / 2;
      if (mid < labelLimit) continue;
      let best = centers[0];
      for (const k of centers) if (Math.abs(k.c - mid) < Math.abs(best.c - mid)) best = k;
      tb.add(best.day, c.s, rowIdx);
    }
  });
  flush();
  return found ? out.join('\n') : null;
}
