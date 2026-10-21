import type { BaseUnit, Food } from './types';

const SRC = 'Valor de referencia genérico (tablas BEDCA/USDA, aproximado). Puede variar según marca.';

type Row = [id: string, name: string, base: BaseUnit, kcal: number, p: number, c: number, f: number, cat: string, def: number, unitName?: string, unitSize?: number];

// Valores por 100 g / 100 ml (o por unidad si base = 'ud'). Hidratos sin fibra (criterio etiqueta UE).
const ROWS: Row[] = [
  // Lácteos
  ['leche-entera', 'Leche entera', 'ml', 63, 3.1, 4.7, 3.6, 'Lácteos', 250, 'vaso', 250],
  ['leche-semi', 'Leche semidesnatada', 'ml', 46, 3.2, 4.7, 1.6, 'Lácteos', 250, 'vaso', 250],
  ['leche-desnatada', 'Leche desnatada', 'ml', 35, 3.4, 4.9, 0.2, 'Lácteos', 250, 'vaso', 250],
  ['bebida-avena', 'Bebida de avena', 'ml', 45, 0.8, 7, 1.5, 'Lácteos', 250, 'vaso', 250],
  ['yogur-natural', 'Yogur natural', 'g', 61, 3.5, 4.7, 3.3, 'Lácteos', 125, 'yogur', 125],
  ['yogur-desnatado', 'Yogur natural desnatado', 'g', 40, 4.2, 5.5, 0.1, 'Lácteos', 125, 'yogur', 125],
  ['yogur-griego', 'Yogur griego natural', 'g', 130, 3.2, 4, 10, 'Lácteos', 125, 'yogur', 125],
  ['skyr', 'Skyr / yogur alto en proteína', 'g', 63, 11, 4, 0.2, 'Lácteos', 150, 'tarrina', 150],
  ['queso-batido', 'Queso fresco batido 0%', 'g', 46, 8, 3.5, 0.1, 'Lácteos', 125, 'tarrina', 250],
  ['queso-burgos', 'Queso fresco tipo Burgos', 'g', 175, 12, 2.5, 13, 'Lácteos', 60],
  ['queso-burgos-light', 'Queso fresco tipo Burgos 0%', 'g', 100, 13, 3, 4, 'Lácteos', 60],
  ['queso-semicurado', 'Queso semicurado', 'g', 380, 25, 1, 31, 'Lácteos', 30, 'loncha', 20],
  ['mozzarella', 'Mozzarella fresca', 'g', 254, 18, 1, 20, 'Lácteos', 60, 'bola', 125],
  ['mantequilla', 'Mantequilla', 'g', 740, 0.7, 0.6, 82, 'Grasas', 10],
  // Huevos
  ['huevo', 'Huevo', 'g', 143, 12.6, 0.7, 9.5, 'Huevos', 60, 'huevo', 60],
  ['clara', 'Clara de huevo', 'g', 52, 10.9, 0.7, 0.2, 'Huevos', 100, 'clara', 33],
  // Carnes
  ['pollo-crudo', 'Pechuga de pollo (cruda)', 'g', 120, 22.5, 0, 2.6, 'Carnes', 150],
  ['pollo-cocinado', 'Pechuga de pollo (a la plancha)', 'g', 165, 31, 0, 3.6, 'Carnes', 120],
  ['pavo-crudo', 'Pechuga de pavo (cruda)', 'g', 105, 23.5, 0, 1, 'Carnes', 150],
  ['fiambre-pavo', 'Fiambre de pechuga de pavo', 'g', 100, 18, 2, 2, 'Carnes', 45, 'loncha', 15],
  ['jamon-serrano', 'Jamón serrano', 'g', 241, 30, 0, 13, 'Carnes', 30, 'loncha', 15],
  ['jamon-cocido', 'Jamón cocido', 'g', 115, 18, 1.5, 4, 'Carnes', 45, 'loncha', 15],
  ['ternera-magra', 'Ternera magra (cruda)', 'g', 130, 21, 0, 5, 'Carnes', 150],
  ['carne-picada', 'Carne picada mixta (cruda)', 'g', 250, 17, 0, 20, 'Carnes', 120],
  ['lomo-cerdo', 'Lomo de cerdo (crudo)', 'g', 150, 21, 0, 7, 'Carnes', 150],
  ['hamburguesa', 'Hamburguesa de ternera (cruda)', 'g', 230, 17, 1, 17, 'Carnes', 100, 'unidad', 100],
  ['chorizo', 'Chorizo', 'g', 455, 24, 2, 39, 'Carnes', 30],
  // Pescados
  ['merluza', 'Merluza', 'g', 80, 17, 0, 1.3, 'Pescados', 150],
  ['bacalao', 'Bacalao fresco', 'g', 80, 18, 0, 0.7, 'Pescados', 150],
  ['salmon', 'Salmón', 'g', 205, 20, 0, 13, 'Pescados', 150],
  ['atun-natural', 'Atún al natural (escurrido)', 'g', 110, 25, 0, 1, 'Pescados', 52, 'lata', 52],
  ['atun-aceite', 'Atún en aceite (escurrido)', 'g', 190, 26, 0, 9.5, 'Pescados', 52, 'lata', 52],
  ['sardinas-lata', 'Sardinas en aceite (escurridas)', 'g', 210, 24, 0, 12, 'Pescados', 60],
  ['gambas', 'Gambas / langostinos', 'g', 85, 20, 0, 0.5, 'Pescados', 120],
  // Cereales y feculentos
  ['pan-blanco', 'Pan blanco (barra)', 'g', 265, 8.5, 51, 1.6, 'Cereales', 60, 'rebanada', 30],
  ['pan-integral', 'Pan integral', 'g', 245, 10, 41, 3.5, 'Cereales', 60, 'rebanada', 30],
  ['pan-molde', 'Pan de molde', 'g', 265, 8, 47, 4, 'Cereales', 54, 'rebanada', 27],
  ['biscotes', 'Tostadas tipo biscote', 'g', 400, 11, 72, 6, 'Cereales', 16, 'tostada', 8],
  ['avena', 'Copos de avena', 'g', 375, 13.5, 59, 7, 'Cereales', 40],
  ['cereales', 'Cereales de desayuno tipo corn flakes', 'g', 375, 7, 84, 1, 'Cereales', 30],
  ['arroz-crudo', 'Arroz blanco (crudo)', 'g', 355, 7, 78, 0.6, 'Cereales', 70],
  ['arroz-cocido', 'Arroz blanco (cocido)', 'g', 130, 2.7, 28, 0.3, 'Cereales', 150],
  ['pasta-cruda', 'Pasta (cruda)', 'g', 355, 12.5, 71, 1.5, 'Cereales', 80],
  ['pasta-cocida', 'Pasta (cocida)', 'g', 155, 5.5, 30, 0.9, 'Cereales', 200],
  ['quinoa-cocida', 'Quinoa (cocida)', 'g', 120, 4.4, 21, 1.9, 'Cereales', 150],
  ['tortilla-trigo', 'Tortilla de trigo (wrap)', 'g', 310, 8, 51, 8, 'Cereales', 40, 'wrap', 40],
  ['patata-cocida', 'Patata cocida / al horno', 'g', 86, 1.9, 20, 0.1, 'Feculentos', 200, 'patata mediana', 170],
  ['patatas-fritas', 'Patatas fritas (caseras)', 'g', 300, 3.5, 37, 15, 'Feculentos', 120],
  ['boniato', 'Boniato', 'g', 86, 1.6, 20, 0.1, 'Feculentos', 200],
  // Legumbres
  ['garbanzos-cocidos', 'Garbanzos cocidos (bote)', 'g', 140, 8, 20, 2.5, 'Legumbres', 200],
  ['lentejas-cocidas', 'Lentejas cocidas (bote)', 'g', 105, 9, 13, 0.5, 'Legumbres', 200],
  ['alubias-cocidas', 'Alubias cocidas (bote)', 'g', 100, 7, 13, 0.5, 'Legumbres', 200],
  ['hummus', 'Hummus', 'g', 250, 7, 13, 18, 'Legumbres', 40],
  // Frutas
  ['platano', 'Plátano', 'g', 90, 1.1, 20, 0.3, 'Frutas', 120, 'plátano', 120],
  ['manzana', 'Manzana', 'g', 52, 0.3, 12, 0.2, 'Frutas', 180, 'manzana', 180],
  ['naranja', 'Naranja', 'g', 45, 0.9, 9, 0.1, 'Frutas', 180, 'naranja', 180],
  ['mandarina', 'Mandarina', 'g', 50, 0.8, 11, 0.2, 'Frutas', 80, 'mandarina', 80],
  ['pera', 'Pera', 'g', 55, 0.4, 12, 0.1, 'Frutas', 170, 'pera', 170],
  ['kiwi', 'Kiwi', 'g', 60, 1.1, 11, 0.5, 'Frutas', 75, 'kiwi', 75],
  ['fresas', 'Fresas', 'g', 32, 0.7, 6, 0.3, 'Frutas', 150],
  ['uvas', 'Uvas', 'g', 70, 0.7, 16, 0.2, 'Frutas', 120],
  ['melocoton', 'Melocotón', 'g', 40, 0.9, 9, 0.1, 'Frutas', 150, 'melocotón', 150],
  ['sandia', 'Sandía', 'g', 30, 0.6, 7, 0.2, 'Frutas', 250],
  ['melon', 'Melón', 'g', 34, 0.8, 8, 0.2, 'Frutas', 250],
  ['arandanos', 'Arándanos', 'g', 57, 0.7, 12, 0.3, 'Frutas', 80],
  ['aguacate', 'Aguacate', 'g', 160, 2, 1.9, 15, 'Frutas', 70, 'aguacate', 140],
  // Verduras
  ['lechuga', 'Lechuga / mezclum', 'g', 15, 1.4, 1.5, 0.2, 'Verduras', 80],
  ['tomate', 'Tomate', 'g', 18, 0.9, 3.5, 0.2, 'Verduras', 120, 'tomate', 120],
  ['zanahoria', 'Zanahoria', 'g', 41, 0.9, 7.5, 0.2, 'Verduras', 80, 'zanahoria', 80],
  ['brocoli', 'Brócoli', 'g', 34, 2.8, 4, 0.4, 'Verduras', 150],
  ['calabacin', 'Calabacín', 'g', 17, 1.2, 2.5, 0.3, 'Verduras', 150],
  ['espinacas', 'Espinacas', 'g', 23, 2.9, 1.4, 0.4, 'Verduras', 100],
  ['pimiento', 'Pimiento', 'g', 25, 1, 4.5, 0.3, 'Verduras', 100],
  ['cebolla', 'Cebolla', 'g', 40, 1.1, 8, 0.1, 'Verduras', 50],
  ['champinones', 'Champiñones', 'g', 22, 3.1, 0.3, 0.3, 'Verduras', 100],
  ['judias-verdes', 'Judías verdes', 'g', 31, 1.8, 4.5, 0.2, 'Verduras', 150],
  ['pepino', 'Pepino', 'g', 15, 0.7, 2.6, 0.1, 'Verduras', 100],
  ['tomate-frito', 'Tomate frito', 'g', 80, 1.5, 9, 3.5, 'Verduras', 50],
  ['gazpacho', 'Gazpacho (envasado)', 'ml', 45, 0.8, 4, 3, 'Verduras', 250, 'vaso', 250],
  // Grasas y frutos secos
  ['aceite-oliva', 'Aceite de oliva', 'g', 899, 0, 0, 99.9, 'Grasas', 10, 'cucharada', 10],
  ['mayonesa', 'Mayonesa', 'g', 680, 1, 1, 75, 'Grasas', 15, 'cucharada', 15],
  ['almendras', 'Almendras', 'g', 600, 21, 7, 52, 'Frutos secos', 25],
  ['nueces', 'Nueces', 'g', 654, 15, 7, 65, 'Frutos secos', 20],
  ['cacahuetes', 'Cacahuetes', 'g', 590, 25, 8, 50, 'Frutos secos', 25],
  ['crema-cacahuete', 'Crema de cacahuete', 'g', 600, 25, 13, 50, 'Frutos secos', 15, 'cucharada', 15],
  ['chocolate-negro', 'Chocolate negro 70%', 'g', 580, 8, 34, 42, 'Dulces', 20, 'onza', 10],
  // Bebidas
  ['cafe-solo', 'Café solo', 'ml', 1, 0.1, 0, 0, 'Bebidas', 50, 'taza', 50],
  ['zumo-naranja', 'Zumo de naranja', 'ml', 45, 0.7, 10, 0.2, 'Bebidas', 200, 'vaso', 200],
  ['refresco-cola', 'Refresco de cola', 'ml', 42, 0, 10.6, 0, 'Bebidas', 330, 'lata', 330],
  ['refresco-zero', 'Refresco zero', 'ml', 0.3, 0, 0, 0, 'Bebidas', 330, 'lata', 330],
  ['cerveza', 'Cerveza', 'ml', 43, 0.5, 3.5, 0, 'Bebidas', 200, 'caña', 200],
  ['vino-tinto', 'Vino tinto', 'ml', 85, 0.1, 2.6, 0, 'Bebidas', 150, 'copa', 150],
  ['whey', 'Proteína whey (polvo)', 'g', 380, 78, 7, 5, 'Suplementos', 30, 'cacito', 30],
  // Dulces y otros
  ['galletas-maria', 'Galletas tipo María', 'g', 440, 7, 74, 12, 'Dulces', 30, 'galleta', 6],
  ['croissant', 'Croissant', 'g', 400, 8, 45, 21, 'Dulces', 60, 'croissant', 60],
  ['magdalena', 'Magdalena', 'g', 440, 6, 52, 23, 'Dulces', 30, 'magdalena', 30],
  ['miel', 'Miel', 'g', 304, 0.3, 82, 0, 'Dulces', 15, 'cucharada', 15],
  ['azucar', 'Azúcar', 'g', 400, 0, 100, 0, 'Dulces', 5, 'cucharadita', 5],
  ['mermelada', 'Mermelada', 'g', 250, 0.4, 60, 0.1, 'Dulces', 15, 'cucharada', 15],
  ['cacao-soluble', 'Cacao soluble', 'g', 375, 6, 80, 3, 'Dulces', 15, 'cucharada', 15],
  ['barrita-cereales', 'Barrita de cereales', 'g', 400, 6, 70, 10, 'Dulces', 25, 'barrita', 25],
];

export const BUILTIN_FOODS: Food[] = ROWS.map(([id, name, base, kcal, protein, carbs, fat, category, defaultQty, unitName, unitSize]) => ({
  id: `b:${id}`,
  name,
  base,
  macros: { kcal, protein, carbs, fat },
  category,
  defaultQty,
  unitName,
  unitSize,
  accuracy: 'known',
  source: SRC,
  builtin: true,
}));

const BY_ID = new Map(BUILTIN_FOODS.map((f) => [f.id, f]));

export function builtinFood(id: string): Food {
  const f = BY_ID.get(id.startsWith('b:') ? id : `b:${id}`);
  if (!f) throw new Error(`Alimento desconocido: ${id}`);
  return f;
}

export function allFoods(custom: Food[]): Food[] {
  return [...custom, ...BUILTIN_FOODS];
}

/** Macros por 1 unidad de la cantidad elegida ('g'/'ml' → por gramo; 'ud' → por unidad). */
export function perUnitFor(food: Food, unit: 'base' | 'ud') {
  const m = food.macros;
  if (food.base === 'ud') return { ...m };
  const perGram = { kcal: m.kcal / 100, protein: m.protein / 100, carbs: m.carbs / 100, fat: m.fat / 100 };
  if (unit === 'ud' && food.unitSize) {
    const s = food.unitSize;
    return { kcal: perGram.kcal * s, protein: perGram.protein * s, carbs: perGram.carbs * s, fat: perGram.fat * s };
  }
  return perGram;
}

const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function searchFoods(foods: Food[], query: string, favorites: string[] = []): Food[] {
  const q = strip(query.trim());
  const words = q.split(/\s+/).filter(Boolean);
  const scored = foods
    .map((f) => {
      const n = strip(f.name);
      if (!words.every((w) => n.includes(w))) return null;
      let score = 0;
      if (n.startsWith(q)) score += 10;
      if (words.some((w) => n.split(/[\s/()]+/).includes(w))) score += 4;
      if (favorites.includes(f.id)) score += 6;
      if (!f.builtin) score += 3;
      return { f, score };
    })
    .filter((x): x is { f: Food; score: number } => x !== null);
  scored.sort((a, b) => b.score - a.score || a.f.name.localeCompare(b.f.name));
  return scored.map((x) => x.f);
}
