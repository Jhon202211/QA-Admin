import * as pdfjsLib from 'pdfjs-dist';
import { BM25Index, chunkText } from './bm25';
import type { KnowledgeChunk } from './bm25';

export type { KnowledgeChunk };

// Worker de pdf.js empaquetado por Vite (patrón oficial para bundlers ESM).
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const KNOWLEDGE_DIR = '/knowledge/Laila';

/**
 * Extrae el texto plano de un PDF a partir de su ArrayBuffer, concatenando
 * el contenido de todas sus páginas.
 */
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

// ── LailaKnowledgeService (singleton) ────────────────────────────────────────
//
// Knowledge base independiente para el chatbot de soporte OpenLaila.
// Indexa archivos PDF ubicados en /public/knowledge/Laila/ usando el mismo
// motor BM25 que el resto de la app.

class LailaKnowledgeService {
  private index: BM25Index | null = null;
  private allChunks: KnowledgeChunk[] = [];
  private fileCount = 0;
  private _initialized = false;
  private _initPromise: Promise<void> | null = null;

  /**
   * Carga los PDFs de /public/knowledge/Laila/, extrae su texto, los
   * fragmenta y construye el índice BM25. Es seguro llamarlo múltiples
   * veces (idempotente).
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  private async _doInit(): Promise<void> {
    try {
      const manifestRes = await fetch(`${KNOWLEDGE_DIR}/manifest.json`);
      if (!manifestRes.ok) {
        console.warn('[LailaKnowledgeService] manifest.json no encontrado — base de conocimiento vacía');
        this._initialized = true;
        return;
      }

      const files: string[] = await manifestRes.json();
      const chunks: KnowledgeChunk[] = [];

      for (const filename of files) {
        try {
          const res = await fetch(`${KNOWLEDGE_DIR}/${encodeURIComponent(filename)}`);
          if (!res.ok) {
            console.warn(`[LailaKnowledgeService] No se pudo cargar: ${filename}`);
            continue;
          }

          // Preferimos .md/.txt (texto plano, ya convertido) — solo los .pdf
          // se extraen en el browser vía pdf.js.
          const isPdf = filename.toLowerCase().endsWith('.pdf');
          const text = isPdf
            ? (await extractPdfText(await res.arrayBuffer())).trim()
            : (await res.text()).trim();

          if (text) chunks.push(...chunkText(text, filename));
        } catch (e) {
          console.warn(`[LailaKnowledgeService] Error al leer/parsear: ${filename}`, e);
        }
      }

      this.allChunks = chunks;
      this.fileCount = files.length;

      if (chunks.length > 0) {
        this.index = new BM25Index(chunks);
        console.log(
          `[LailaKnowledgeService] Índice BM25 listo: ${chunks.length} chunks de ${files.length} PDF(s)`
        );
      } else {
        console.warn('[LailaKnowledgeService] No se indexaron documentos PDF');
      }
    } catch (e) {
      console.warn('[LailaKnowledgeService] Error durante la inicialización:', e);
    } finally {
      this._initialized = true;
    }
  }

  /**
   * Recupera los `topK` chunks más relevantes para la query usando BM25.
   * Inicializa el índice automáticamente si aún no se ha hecho.
   */
  async retrieve(query: string, topK = 5): Promise<KnowledgeChunk[]> {
    await this.initialize();
    return this.index?.retrieve(query, topK) ?? [];
  }

  /** Número total de chunks indexados. */
  get chunkCount(): number {
    return this.allChunks.length;
  }

  /** Número de archivos PDF listados en el manifest. */
  get documentCount(): number {
    return this.fileCount;
  }

  /** true si el índice está listo y tiene documentos. */
  get isReady(): boolean {
    return this._initialized && this.index !== null;
  }

  /** true si ya completó la inicialización (con o sin documentos). */
  get isInitialized(): boolean {
    return this._initialized;
  }
}

export const lailaKnowledgeService = new LailaKnowledgeService();
