import { BM25Index, chunkText } from './bm25';
import type { KnowledgeChunk } from './bm25';

export type { KnowledgeChunk };

// ── KnowledgeService (singleton) ─────────────────────────────────────────────
//
// Knowledge base del agente de generación de casos de prueba (Pruebas manuales).
// Ver `lailaKnowledgeService.ts` para la base de conocimiento independiente
// del chatbot OpenLaila.

class KnowledgeService {
  private index: BM25Index | null = null;
  private allChunks: KnowledgeChunk[] = [];
  private _initialized = false;
  private _initPromise: Promise<void> | null = null;

  /**
   * Carga los archivos de /public/knowledge/, los fragmenta y construye el índice BM25.
   * Es seguro llamarlo múltiples veces (idempotente).
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  private async _doInit(): Promise<void> {
    try {
      const manifestRes = await fetch('/knowledge/manifest.json');
      if (!manifestRes.ok) {
        console.warn('[KnowledgeService] manifest.json no encontrado — knowledge base desactivada');
        this._initialized = true;
        return;
      }

      const files: string[] = await manifestRes.json();
      const chunks: KnowledgeChunk[] = [];

      for (const filename of files) {
        try {
          const res = await fetch(`/knowledge/${filename}`);
          if (!res.ok) {
            console.warn(`[KnowledgeService] No se pudo cargar: ${filename}`);
            continue;
          }
          const text = (await res.text()).trim();
          if (text) chunks.push(...chunkText(text, filename));
        } catch {
          console.warn(`[KnowledgeService] Error al leer: ${filename}`);
        }
      }

      this.allChunks = chunks;

      if (chunks.length > 0) {
        this.index = new BM25Index(chunks);
        console.log(
          `[KnowledgeService] Índice BM25 listo: ${chunks.length} chunks de ${files.length} archivo(s)`
        );
      } else {
        console.warn('[KnowledgeService] No se indexaron documentos');
      }
    } catch (e) {
      console.warn('[KnowledgeService] Error durante la inicialización:', e);
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

  /** true si el índice está listo y tiene documentos. */
  get isReady(): boolean {
    return this._initialized && this.index !== null;
  }

  /** true si ya completó la inicialización (con o sin documentos). */
  get isInitialized(): boolean {
    return this._initialized;
  }
}

export const knowledgeService = new KnowledgeService();
