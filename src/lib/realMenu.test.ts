import menuText from '../../menu-semana-19-oct.txt?raw';
import { describe, expect, it } from 'vitest';
import { parseMenuText, buildWeekMenu } from './menuParser';
import { estimateDish } from './estimate';

describe('menú real del colegio (semana 19 oct)', () => {
  it('se lee completo y todos los platos tienen un tipo reconocido', () => {
    const { days, warnings } = parseMenuText(menuText);
    expect(warnings).toEqual([]);
    for (const d of days) {
      expect(d.desayuno).toHaveLength(1);
      expect(d.comida).toHaveLength(4);
      expect(d.cena).toHaveLength(4);
    }
    const all = days.flatMap((d) => [...d.desayuno, ...d.comida, ...d.cena]);
    const generic = all.filter((n) => estimateDish(n).generic);
    expect(generic).toEqual([]);
    expect(buildWeekMenu(days, '2026-10-19', {}).days[1].cena[3].macros.kcal).toBe(100); // Lácteo
  });
});
