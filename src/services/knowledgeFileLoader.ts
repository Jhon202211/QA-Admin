import * as pdfjsLib from 'pdfjs-dist';

// Worker de pdf.js empaquetado por Vite (patrón oficial para bundlers ESM).
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/** Extrae texto plano de todas las páginas de un PDF. */
async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    pageTexts.push(pageText);
  }

  return pageTexts.join('\n\n');
}

/**
 * Descarga un documento desde una URL (S3 firmada u otra) y devuelve su texto.
 * Markdown/TXT se leen directo; PDF con pdf.js.
 */
export async function loadKnowledgeFromUrl(url: string, filenameHint = ''): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const pathForExt = filenameHint || url.split('?')[0];
  const isPdf = pathForExt.toLowerCase().endsWith('.pdf');
  const text = isPdf
    ? await extractPdfText(await response.arrayBuffer())
    : await response.text();

  return text.trim();
}
