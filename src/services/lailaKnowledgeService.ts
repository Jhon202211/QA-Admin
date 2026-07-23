import { BM25Index, chunkText } from './bm25';
import type { KnowledgeChunk } from './bm25';
import { loadKnowledgeFile, parseKnowledgeManifest } from './knowledgeFileLoader';

export type { KnowledgeChunk };

const KNOWLEDGE_DIR = '/knowledge/Laila';

// ── LailaKnowledgeService (singleton) ────────────────────────────────────────
//
// Knowledge base independiente para el chatbot de soporte OpenLaila.
// Indexa documentos ubicados en /public/knowledge/Laila/ usando el mismo motor
// BM25 que el resto de la app.

class LailaKnowledgeService {
  private index: BM25Index | null = null;
  private allChunks: KnowledgeChunk[] = [];
  private fileCount = 0;
  private _initialized = false;
  private _initPromise: Promise<void> | null = null;

  /**
   * Carga los documentos de /public/knowledge/Laila/, extrae su texto, los
   * fragmenta y construye el índice BM25. Es seguro llamarlo múltiples veces.
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

      const files = parseKnowledgeManifest(
        await manifestRes.json(),
        `${KNOWLEDGE_DIR}/manifest.json`
      );
      const chunks: KnowledgeChunk[] = [];
      let loadedFiles = 0;

      for (const filename of files) {
        try {
          const text = await loadKnowledgeFile(KNOWLEDGE_DIR, filename);

          if (text) {
            chunks.push(...chunkText(text, filename));
            loadedFiles += 1;
          }
        } catch (e) {
          console.warn(`[LailaKnowledgeService] Error al leer/parsear: ${filename}`, e);
        }
      }

      this.allChunks = chunks;
      this.fileCount = loadedFiles;

      if (chunks.length > 0) {
        this.index = new BM25Index(chunks);
        console.log(
          `[LailaKnowledgeService] Índice BM25 listo: ${chunks.length} chunks de ${loadedFiles} documento(s)`
        );
      } else {
        console.warn('[LailaKnowledgeService] No se indexaron documentos');
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

  /** Número de documentos cargados correctamente. */
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
