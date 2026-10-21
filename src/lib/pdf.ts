import { pdfRowsToText, type Fragment } from './menuTable';

/** Extrae el texto de un PDF localmente (sin internet). Agrupa los fragmentos por líneas. */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rows = new Map<number, Fragment[]>();
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      const x = item.transform[4];
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x, w: item.width, s: item.str });
    }
    const sorted = [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, parts]) => parts as Fragment[]);
    // Menú en tabla (una columna por día): se reorganiza por día; si no, línea a línea
    const table = pdfRowsToText(sorted);
    const lines = table !== null ? [table] : sorted.map((parts) => {
      parts.sort((a, b) => a.x - b.x);
      // Huecos grandes entre fragmentos suelen ser columnas distintas → separador de plato
      return parts.reduce((acc, p, i) => {
        if (i === 0) return p.s.trim();
        const prev = parts[i - 1];
        const gap = p.x - (prev.x + prev.w);
        return acc + (gap > 12 ? ' / ' : ' ') + p.s.trim();
      }, '');
    });
    pages.push(lines.join('\n'));
  }
  return pages.join('\n\n');
}
