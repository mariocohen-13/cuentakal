import type { Macros } from './types';

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Rule {
  re: RegExp;
  label: string;
  m: Macros; // por ración típica de comedor
  main?: boolean; // segundo plato: admite guarnición
}

const M = (kcal: number, protein: number, carbs: number, fat: number): Macros => ({ kcal, protein, carbs, fat });

/**
 * Estimaciones genéricas por TIPO de plato para una ración típica de comedor.
 * No son datos del colegio: sirven como punto de partida y deben corregirse cuando se conozcan.
 * El orden importa: las reglas más específicas van primero.
 */
const RULES: Rule[] = [
  // Postres y lácteos
  { re: /\b(fruta|manzana|pera|naranja|platano|mandarina|kiwi|melon|sandia|macedonia)\b/, label: 'pieza de fruta', m: M(70, 1, 16, 0) },
  { re: /\b(yogur|yogurt|lacteo|lacteos)\b/, label: 'yogur', m: M(100, 4, 14, 3) },
  { re: /\b(flan|natillas|cuajada|mousse|arroz con leche|crema catalana)\b/, label: 'postre lácteo', m: M(170, 4, 26, 5) },
  { re: /\b(tarta|bizcocho|brownie|pastel|tiramisu|profiteroles|donut|rosquilla)\b/, label: 'repostería', m: M(350, 5, 45, 17) },
  { re: /\bhelado\b/, label: 'helado', m: M(200, 3, 25, 10) },
  // Desayuno
  { re: /\bdesayuno continental\b/, label: 'desayuno continental (café con leche, tostadas con mantequilla y mermelada, zumo)', m: M(450, 12, 68, 14) },
  { re: /\b(croissant|napolitana|palmera|bolleria|ensaimada)\b/, label: 'bollería', m: M(270, 5, 30, 14) },
  { re: /\b(magdalena|muffin)\b/, label: 'magdalena', m: M(180, 3, 22, 9) },
  { re: /\b(churros|porras)\b/, label: 'churros', m: M(350, 4, 40, 19) },
  { re: /\b(cereales|muesli|granola)\b/, label: 'cereales con leche', m: M(250, 9, 40, 5) },
  { re: /\b(tostada|tostadas)\b/, label: 'tostada', m: M(200, 5, 28, 7) },
  { re: /\b(cafe con leche|colacao|cola cao|cacao)\b/, label: 'bebida con leche', m: M(110, 6, 12, 4) },
  // Primeros
  { re: /\bensaladilla\b/, label: 'ensaladilla rusa', m: M(300, 7, 25, 19) },
  { re: /\bensalada (de )?(pasta|arroz|patata|garbanzos|lentejas|quinoa)\b/, label: 'ensalada completa', m: M(380, 12, 45, 16) },
  { re: /\bensaladas?\b/, label: 'ensalada', m: M(130, 3, 8, 9) },
  { re: /\b(salmorejo)\b/, label: 'salmorejo', m: M(250, 5, 20, 16) },
  { re: /\b(gazpacho)\b/, label: 'gazpacho', m: M(130, 2, 10, 9) },
  { re: /\b(crema|pure|vichyssoise|vichissoise)\b/, label: 'crema de verduras', m: M(160, 4, 16, 8) },
  { re: /\b(sopa|caldo|consome)\b/, label: 'sopa', m: M(150, 7, 20, 4) },
  { re: /\b(fabada|cocido|potaje|lentejas con chorizo|alubias con chorizo|judias con chorizo)\b/, label: 'legumbre con embutido', m: M(480, 23, 48, 20) },
  { re: /\b(lentejas|garbanzos|alubias|judias blancas|judiones|pochas|legumbre)/, label: 'legumbre guisada', m: M(370, 19, 48, 10) },
  { re: /\b(paella|arroz)\b/, label: 'arroz', m: M(450, 14, 70, 12) },
  { re: /\b(lasana|canelones)\b/, label: 'lasaña / canelones', m: M(520, 25, 42, 27) },
  { re: /\b(pizza)\b/, label: 'pizza', m: M(600, 25, 70, 24) },
  { re: /\b(macarrones|espaguetis|spaghetti|tallarines|pasta|fideua|fideos|tortellini|ravioli|noodles)\b/, label: 'pasta', m: M(500, 18, 68, 16) },
  { re: /\b(patatas (a la )?(riojana|guisadas|con carne|a lo pobre)|marmitako)\b/, label: 'guiso de patata', m: M(400, 18, 40, 18) },
  { re: /\bpimientos? rellenos?\b/, label: 'pimientos rellenos', m: M(330, 15, 30, 16) },
  { re: /\b(pisto|menestra|judias verdes|verduras|parrillada de verduras|brocoli|coliflor|espinacas|acelgas|alcachofas|calabacin|berenjena)\b/, label: 'verdura cocinada', m: M(150, 5, 14, 8) },
  // Segundos
  { re: /\b(empanada|empanadillas?)\b/, label: 'empanada', m: M(420, 12, 42, 22), main: true },
  { re: /\b(empanad[oa]s?|rebozad[oa]s?|a la romana|nuggets|san jacobo|cordon bleu|milanesa|escalope|fingers|varitas)\b/, label: 'rebozado / frito', m: M(400, 24, 22, 24), main: true },
  { re: /\b(croquetas)\b/, label: 'croquetas', m: M(350, 10, 30, 20), main: true },
  { re: /\b(calamares|sepia|pulpo|chipirones)\b/, label: 'cefalópodos', m: M(250, 25, 6, 13), main: true },
  { re: /\b(tortilla)\b/, label: 'tortilla', m: M(330, 13, 18, 23), main: true },
  { re: /\b(huevos?|revuelto)\b/, label: 'huevos', m: M(260, 15, 3, 21), main: true },
  { re: /\b(albondigas)\b/, label: 'albóndigas en salsa', m: M(400, 22, 16, 27), main: true },
  { re: /\b(hamburguesa)\b/, label: 'hamburguesa (sin pan)', m: M(380, 24, 6, 29), main: true },
  { re: /\b(salchichas|butifarra|longaniza|chistorra)\b/, label: 'salchichas', m: M(350, 14, 4, 31), main: true },
  { re: /\b(salmon|atun|bonito|caballa|sardinas|boquerones|trucha|emperador|pez espada)\b/, label: 'pescado azul', m: M(300, 28, 2, 20), main: true },
  { re: /\b(merluza|bacalao|lenguado|abadejo|gallo|dorada|lubina|rape|panga|perca|pescado|gambas|langostinos|mejillones)\b/, label: 'pescado blanco / marisco', m: M(220, 28, 4, 10), main: true },
  { re: /\b(pollo|pavo|contramuslos?|muslos?|muslitos|alitas)\b/, label: 'pollo / pavo', m: M(300, 34, 3, 17), main: true },
  { re: /\b(ternera|vacuno|filete|entrecot|estofado|carne|ragout|guiso|ropa vieja|redondo|rabo)\b/, label: 'carne de ternera / guiso', m: M(350, 30, 8, 21), main: true },
  { re: /\b(cerdo|lomo|chuleta|costillas|secreto|presa|pluma|cinta|solomillo|cordero|conejo)\b/, label: 'carne de cerdo / otras', m: M(350, 30, 2, 24), main: true },
  // Guarniciones y otros
  { re: /\b(patatas fritas|patatas)\b/, label: 'guarnición de patata', m: M(250, 4, 32, 12) },
  { re: /\b(pan)\b/, label: 'pan (50 g)', m: M(130, 4, 25, 1) },
  { re: /\b(bocadillo|sandwich|pepito|wrap|burrito|kebab)\b/, label: 'bocadillo', m: M(450, 22, 50, 17) },
];

const GARNISHES: { re: RegExp; label: string; m: Macros }[] = [
  { re: /\bcon (patatas?|pure de patata)/, label: 'patata', m: M(200, 3, 25, 10) },
  { re: /\bcon arroz\b/, label: 'arroz', m: M(160, 3, 34, 1) },
  { re: /\bcon (ensalada|lechuga|tomate)\b/, label: 'ensalada', m: M(40, 1, 3, 3) },
  { re: /\bcon (verduras|pimientos?|pisto|champinones|setas|menestra|judias verdes)\b/, label: 'verdura', m: M(60, 1, 6, 3) },
];

const GENERIC = { label: 'plato genérico (sin pistas)', m: M(400, 18, 40, 18) };

export interface DishEstimate {
  macros: Macros;
  label: string;
  generic: boolean;
}

export function estimateDish(name: string): DishEstimate {
  const n = normalizeName(name);
  for (const r of RULES) {
    if (!r.re.test(n)) continue;
    const g = r.main ? GARNISHES.find((x) => x.re.test(n)) : undefined;
    if (!g) return { macros: { ...r.m }, label: r.label, generic: false };
    return {
      macros: { kcal: r.m.kcal + g.m.kcal, protein: r.m.protein + g.m.protein, carbs: r.m.carbs + g.m.carbs, fat: r.m.fat + g.m.fat },
      label: `${r.label} + guarnición de ${g.label}`,
      generic: false,
    };
  }
  return { macros: { ...GENERIC.m }, label: GENERIC.label, generic: true };
}

export function estimateNote(e: DishEstimate): string {
  return e.generic
    ? 'Estimación genérica: no se reconoce el tipo de plato. Corrígela si puedes.'
    : `Estimación por tipo de plato (${e.label}, ración típica de comedor). No es un dato del colegio.`;
}
