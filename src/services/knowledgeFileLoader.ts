import * as pdfjsLib from 'pdfjs-dist';

const SUPPORTED_EXTENSIONS = new Set(['md', 'txt', 'pdf']);

// Worker de pdf.js empaquetado por Vite (patrón oficial para bundlers ESM).
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Valida manifiestos servidos como assets públicos. Solo se aceptan nombres de
 * archivo simples para impedir rutas absolutas o recorridos con `../`.
 */
export function parseKnowledgeManifest(value: unknown, manifestUrl: string): string[] {
  if (!Array.isArray(value)) {
    console.warn(`[Knowledge] Manifiesto inválido (se esperaba un arreglo): ${manifestUrl}`);
    return [];
  }

  const validFiles: string[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== 'string') {
      console.warn(`[Knowledge] Entrada no textual ignorada en: ${manifestUrl}`);
      continue;
    }

    const filename = entry.trim();
    const extension = filename.split('.').pop()?.toLowerCase() ?? '';
    const isSafe =
      filename.length > 0 &&
      filename !== '.' &&
      filename !== '..' &&
      !filename.includes('/') &&
      !filename.includes('\\') &&
      !filename.includes('\0');

    if (!isSafe) {
      console.warn(`[Knowledge] Ruta insegura ignorada en ${manifestUrl}: ${filename}`);
      continue;
    }
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      console.warn(`[Knowledge] Formato no soportado ignorado en ${manifestUrl}: ${filename}`);
      continue;
    }
    if (!seen.has(filename)) {
      seen.add(filename);
      validFiles.push(filename);
    }
  }

  return validFiles;
}

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
 * Descarga un documento validado y devuelve su texto. Los Markdown y TXT se
 * leen directamente; los PDF se procesan con pdf.js.
 */
export async function loadKnowledgeFile(baseUrl: string, filename: string): Promise<string> {
  const response = await fetch(`${baseUrl}/${encodeURIComponent(filename)}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const isPdf = filename.toLowerCase().endsWith('.pdf');
  const text = isPdf
    ? await extractPdfText(await response.arrayBuffer())
    : await response.text();

  return text.trim();
}
