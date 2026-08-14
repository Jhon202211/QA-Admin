import { BM25Index, chunkText } from './bm25';
import type { KnowledgeChunk } from './bm25';
import {
  fetchKnowledgeDocText,
  listKnowledgeDocs,
} from './lailaKnowledgeAdminService';

export type { KnowledgeChunk };

// ── KnowledgeService (singleton) ─────────────────────────────────────────────
//
// Knowledge base del agente de generación de casos de prueba (Pruebas manuales).
// Lee el catálogo remoto (Firestore + S3 / contenido inline), ambos bloques:
// plataforma e historial y reglas.

class KnowledgeService {
  private index: BM25Index | null = null;
  private allChunks: KnowledgeChunk[] = [];
  private fileCount = 0;
  private _initialized = false;
  private _initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this._initialized) return;
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async reinitialize(): Promise<void> {
    this._initialized = false;
    this._initPromise = null;
    this.index = null;
    this.allChunks = [];
    this.fileCount = 0;
    return this.initialize();
  }

  private async _doInit(): Promise<void> {
    try {
      const docs = (await listKnowledgeDocs()).filter((d) => d.enabled);
      const chunks: KnowledgeChunk[] = [];
      let loadedFiles = 0;

      for (const docMeta of docs) {
        try {
          const text = await fetchKnowledgeDocText(docMeta);
          if (!text) {
            console.warn(`[KnowledgeService] Documento vacío ignorado: ${docMeta.name}`);
            continue;
          }
          const source =
            docMeta.category === 'plataforma' ? `plataforma/${docMeta.name}` : docMeta.name;
          chunks.push(...chunkText(text, source));
          loadedFiles += 1;
        } catch (error) {
          console.warn(`[KnowledgeService] No se pudo cargar: ${docMeta.name}`, error);
        }
      }

      this.allChunks = chunks;
      this.fileCount = loadedFiles;

      if (chunks.length > 0) {
        this.index = new BM25Index(chunks);
        console.log(
          `[KnowledgeService] Índice BM25 listo: ${chunks.length} chunks de ${loadedFiles} archivo(s)`
        );
      } else {
        console.warn('[KnowledgeService] No se indexaron documentos (catálogo vacío o ilegible)');
      }
    } catch (e) {
      console.warn('[KnowledgeService] Error durante la inicialización:', e);
    } finally {
      this._initialized = true;
    }
  }

  async retrieve(query: string, topK = 5): Promise<KnowledgeChunk[]> {
    await this.initialize();
    return this.index?.retrieve(query, topK) ?? [];
  }

  get chunkCount(): number {
    return this.allChunks.length;
  }

  get documentCount(): number {
    return this.fileCount;
  }

  get isReady(): boolean {
    return this._initialized && this.index !== null;
  }

  get isInitialized(): boolean {
    return this._initialized;
  }
}

export const knowledgeService = new KnowledgeService();
