import { BM25Index, chunkText } from './bm25';
import type { KnowledgeChunk } from './bm25';
import {
  fetchKnowledgeDocText,
  listKnowledgeDocs,
} from './lailaKnowledgeAdminService';

export type { KnowledgeChunk };

// ── LailaKnowledgeService (singleton) ────────────────────────────────────────
//
// Knowledge base del chatbot (módulo IA → Chatbot).
// Usa el catálogo remoto (Firestore + S3 / contenido inline). Por defecto indexa
// el bloque "plataforma"; el historial también se incluye si está activo.

class LailaKnowledgeService {
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
      if (docs.length === 0) {
        console.warn('[LailaKnowledgeService] Catálogo vacío — sube documentos en IA → Base de conocimiento');
        return;
      }

      const chunks: KnowledgeChunk[] = [];
      let loadedFiles = 0;

      for (const docMeta of docs) {
        try {
          const text = await fetchKnowledgeDocText(docMeta);
          if (text) {
            chunks.push(...chunkText(text, docMeta.name));
            loadedFiles += 1;
          }
        } catch (e) {
          console.warn(`[LailaKnowledgeService] Error al leer: ${docMeta.name}`, e);
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
        console.warn('[LailaKnowledgeService] No se indexaron documentos legibles');
      }
    } catch (e) {
      console.warn('[LailaKnowledgeService] Error durante la inicialización:', e);
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

export const lailaKnowledgeService = new LailaKnowledgeService();
