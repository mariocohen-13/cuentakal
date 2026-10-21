import { describe, expect, it } from 'vitest';
import { parseMenuText } from './menuParser';
import { pdfRowsToText, type Fragment } from './menuTable';

describe('menú en tabla', () => {
  it('texto pegado desde Excel/Word (tabuladores)', () => {
    const text = [
      'MENÚ OCTUBRE',
      '\tLUNES\tMARTES\tMIÉRCOLES\tJUEVES\tVIERNES',
      'COMIDA 1º\tlentejas estofadas\tmacarrones con tomate\tpaella\tsopa de fideos\tgazpacho',
      'COMIDA 2º\tpollo asado\tmerluza a la romana\tfilete de ternera\ttortilla de patata\tsalmón',
      'Postre\tfruta\tnatillas\tfruta\tyogur\thelado',
      'CENA\tcrema de calabacín\tensalada mixta\tpuré de verduras\tjudías verdes\tpizza',
    ].join('\n');
    const { days } = parseMenuText(text);
    expect(days[0].comida).toEqual(['Lentejas estofadas', 'Pollo asado', 'Fruta']);
    expect(days[4].comida).toEqual(['Gazpacho', 'Salmón', 'Helado']);
    expect(days[1].cena).toEqual(['Ensalada mixta']);
  });

  it('PDF con columnas por día y platos partidos en dos líneas', () => {
    const f = (x: number, s: string, w = 60): Fragment => ({ x, w, s });
    const rows: Fragment[][] = [
      [f(200, 'MENÚ DEL COLEGIO', 150)],
      [f(110, 'LUNES 20'), f(210, 'MARTES 21'), f(310, 'MIÉRCOLES 22')],
      [f(10, 'COMIDA'), f(105, 'Lentejas'), f(205, 'Macarrones'), f(305, 'Paella mixta')],
      [f(105, 'Pollo asado con'), f(205, 'Merluza'), f(305, 'Filete')],
      [f(105, 'patatas'), f(305, 'de ternera')],
      [f(10, 'CENA'), f(105, 'Crema de calabacín'), f(205, 'Ensalada'), f(305, 'Sopa')],
    ];
    const text = pdfRowsToText(rows)!;
    const { days } = parseMenuText(text);
    expect(days[0].comida).toEqual(['Lentejas', 'Pollo asado con patatas']);
    expect(days[2].comida).toEqual(['Paella mixta', 'Filete de ternera']);
    expect(days[1].cena).toEqual(['Ensalada']);
  });

  it('sin cabecera de días no se trata como tabla', () => {
    expect(pdfRowsToText([[{ x: 0, w: 50, s: 'Lunes' }], [{ x: 0, w: 50, s: 'Comida: Lentejas' }]])).toBeNull();
  });
});
