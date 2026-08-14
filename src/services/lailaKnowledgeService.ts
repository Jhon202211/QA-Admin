import { BM25Index, chunkText } from './bm25';
import type { KnowledgeChunk } from './bm25';
import { loadKnowledgeFile, parseKnowledgeManifest } from './knowledgeFileLoader';
import {
  fetchKnowledgeDocText,
  listKnowledgeDocs,
} from './lailaKnowledgeAdminService';

export type { KnowledgeChunk };

const KNOWLEDGE_DIR = '/knowledge/Laila';

// ── LailaKnowledgeService (singleton) ────────────────────────────────────────
//
// Knowledge base independiente para el chatbot de soporte (módulo IA → Chatbot).
// Prioriza el catálogo remoto (Firestore + S3) y cae al directorio estático
// public/knowledge/Laila/ si aún no hay documentos administrados.

class LailaKnowledgeService {
  private index: BM25Index | null = null;
  private allChunks: KnowledgeChunk[] = [];
  private fileCount = 0;
  private _initialized = false;
  private _initPromise: Promise<void> | null = null;

  /**
   * Carga los documentos, los fragmenta y construye el índice BM25.
   * Es seguro llamarlo múltiples veces; usa `reinitialize` para forzar recarga.
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  /** Invalida el índice para recargar tras cambios en la base de conocimiento. */
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
      const remoteLoaded = await this._loadFromRemoteCatalog();
      if (!remoteLoaded) {
        await this._loadFromStaticAssets();
      }
    } catch (e) {
      console.warn('[LailaKnowledgeService] Error durante la inicialización:', e);
      try {
        await this._loadFromStaticAssets();
      } catch {
        // ya se registró el aviso
      }
    } finally {
      this._initialized = true;
    }
  }

  private async _loadFromRemoteCatalog(): Promise<boolean> {
    const docs = (await listKnowledgeDocs()).filter((d) => d.enabled);
    if (docs.length === 0) return false;

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
        console.warn(`[LailaKnowledgeService] Error al leer remoto: ${docMeta.name}`, e);
      }
    }

    this.allChunks = chunks;
    this.fileCount = loadedFiles;
    if (chunks.length > 0) {
      this.index = new BM25Index(chunks);
      console.log(
        `[LailaKnowledgeService] Índice BM25 (remoto): ${chunks.length} chunks de ${loadedFiles} documento(s)`
      );
      return true;
    }
    return false;
  }

  private async _loadFromStaticAssets(): Promise<void> {
    const manifestRes = await fetch(`${KNOWLEDGE_DIR}/manifest.json`);
    if (!manifestRes.ok) {
      console.warn('[LailaKnowledgeService] manifest.json no encontrado — base de conocimiento vacía');
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
        `[LailaKnowledgeService] Índice BM25 (estático): ${chunks.length} chunks de ${loadedFiles} documento(s)`
      );
    } else {
      console.warn('[LailaKnowledgeService] No se indexaron documentos');
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
