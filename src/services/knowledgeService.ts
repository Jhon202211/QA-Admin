import { BM25Index, chunkText } from './bm25';
import type { KnowledgeChunk } from './bm25';
import { loadKnowledgeFile, parseKnowledgeManifest } from './knowledgeFileLoader';

export type { KnowledgeChunk };

interface KnowledgeCollection {
  name: string;
  baseUrl: string;
  sourcePrefix: string;
  excludedFiles?: ReadonlySet<string>;
}

const KNOWLEDGE_COLLECTIONS: KnowledgeCollection[] = [
  {
    name: 'principal',
    baseUrl: '/knowledge',
    sourcePrefix: '',
  },
  {
    name: 'Laila',
    baseUrl: '/knowledge/Laila',
    sourcePrefix: 'Laila',
    // Este archivo define la personalidad de OpenLaila y no es conocimiento
    // funcional para la generación de casos de prueba.
    excludedFiles: new Set(['instructions.md']),
  },
];

// ── KnowledgeService (singleton) ─────────────────────────────────────────────
//
// Knowledge base del agente de generación de casos de prueba (Pruebas manuales).
// Combina el conocimiento principal y los documentos funcionales de Laila.
// OpenLaila conserva su índice y sus instrucciones independientes.

class KnowledgeService {
  private index: BM25Index | null = null;
  private allChunks: KnowledgeChunk[] = [];
  private fileCount = 0;
  private _initialized = false;
  private _initPromise: Promise<void> | null = null;

  /**
   * Carga los manifiestos principal y de Laila, fragmenta sus documentos y
   * construye un único índice BM25. Cada manifiesto falla de forma aislada y
   * la inicialización es idempotente.
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  private async _doInit(): Promise<void> {
    try {
      const collectionResults = await Promise.all(
        KNOWLEDGE_COLLECTIONS.map((collection) => this.loadCollection(collection))
      );
      const chunks = collectionResults.flatMap((result) => result.chunks);
      const loadedFiles = collectionResults.reduce((total, result) => total + result.loadedFiles, 0);

      this.allChunks = chunks;
      this.fileCount = loadedFiles;

      if (chunks.length > 0) {
        this.index = new BM25Index(chunks);
        console.log(
          `[KnowledgeService] Índice BM25 combinado listo: ${chunks.length} chunks de ${loadedFiles} archivo(s)`
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

  private async loadCollection(
    collection: KnowledgeCollection
  ): Promise<{ chunks: KnowledgeChunk[]; loadedFiles: number }> {
    const manifestUrl = `${collection.baseUrl}/manifest.json`;

    try {
      const manifestResponse = await fetch(manifestUrl);
      if (!manifestResponse.ok) {
        console.warn(
          `[KnowledgeService] Manifiesto ${collection.name} no disponible (HTTP ${manifestResponse.status})`
        );
        return { chunks: [], loadedFiles: 0 };
      }

      const manifest = parseKnowledgeManifest(await manifestResponse.json(), manifestUrl);
      const files = manifest.filter((filename) => {
        if (!collection.excludedFiles?.has(filename.toLowerCase())) return true;
        console.warn(
          `[KnowledgeService] Archivo reservado excluido del índice ${collection.name}: ${filename}`
        );
        return false;
      });
      const chunks: KnowledgeChunk[] = [];
      let loadedFiles = 0;

      for (const filename of files) {
        const source = collection.sourcePrefix
          ? `${collection.sourcePrefix}/${filename}`
          : filename;

        try {
          const text = await loadKnowledgeFile(collection.baseUrl, filename);
          if (!text) {
            console.warn(`[KnowledgeService] Archivo vacío ignorado: ${source}`);
            continue;
          }

          chunks.push(...chunkText(text, source));
          loadedFiles += 1;
        } catch (error) {
          console.warn(`[KnowledgeService] No se pudo cargar: ${source}`, error);
        }
      }

      return { chunks, loadedFiles };
    } catch (error) {
      console.warn(
        `[KnowledgeService] Error al cargar el manifiesto ${collection.name}:`,
        error
      );
      return { chunks: [], loadedFiles: 0 };
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

  /** Número de documentos cargados correctamente entre ambas colecciones. */
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

export const knowledgeService = new KnowledgeService();
