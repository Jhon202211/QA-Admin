// ── Tipos ────────────────────────────────────────────────────────────────────

export interface KnowledgeChunk {
  content: string;
  source: string;
  chunkIndex: number;
}

// ── Tokenización ─────────────────────────────────────────────────────────────

/**
 * Convierte texto a tokens: lowercase, elimina puntuación, filtra tokens
 * cortos. Preserva caracteres españoles (áéíóúüñ).
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\wáéíóúüñ\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

// ── Chunking ─────────────────────────────────────────────────────────────────

/**
 * Divide un texto en chunks de `chunkSize` palabras con solapamiento `overlap`.
 * Replica la lógica de load_knowledge_documents() del backend Python.
 */
function chunkText(text: string, source: string, chunkSize = 400, overlap = 50): KnowledgeChunk[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  if (words.length <= chunkSize) {
    return [{ content: text, source, chunkIndex: 0 }];
  }

  const chunks: KnowledgeChunk[] = [];
  const step = chunkSize - overlap;

  for (let start = 0, idx = 0; start < words.length; start += step, idx++) {
    const content = words.slice(start, start + chunkSize).join(' ');
    if (content.trim()) chunks.push({ content, source, chunkIndex: idx });
  }

  return chunks;
}

// ── BM25 ─────────────────────────────────────────────────────────────────────

/**
 * Implementación de BM25 (Okapi BM25) en TypeScript para búsqueda en el browser.
 * Parámetros estándar: k1=1.5, b=0.75.
 */
class BM25Index {
  private readonly k1 = 1.5;
  private readonly b = 0.75;

  private readonly chunks: KnowledgeChunk[];
  private readonly tokenized: string[][];
  private readonly idf: Map<string, number>;
  private readonly avgdl: number;

  constructor(chunks: KnowledgeChunk[]) {
    this.chunks = chunks;
    this.tokenized = chunks.map((c) => tokenize(c.content));
    this.avgdl =
      this.tokenized.reduce((sum, doc) => sum + doc.length, 0) /
      Math.max(this.tokenized.length, 1);
    this.idf = this.computeIDF();
  }

  private computeIDF(): Map<string, number> {
    const N = this.tokenized.length;
    const df = new Map<string, number>();

    for (const doc of this.tokenized) {
      for (const term of new Set(doc)) {
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }

    const idf = new Map<string, number>();
    for (const [term, freq] of df) {
      // IDF suavizado: log((N - df + 0.5) / (df + 0.5) + 1)
      idf.set(term, Math.log((N - freq + 0.5) / (freq + 0.5) + 1));
    }
    return idf;
  }

  private scoreDoc(queryTerms: string[], docIdx: number): number {
    const doc = this.tokenized[docIdx];
    const dl = doc.length;

    const tf = new Map<string, number>();
    for (const term of doc) tf.set(term, (tf.get(term) ?? 0) + 1);

    let score = 0;
    for (const term of queryTerms) {
      const idf = this.idf.get(term) ?? 0;
      const f = tf.get(term) ?? 0;
      // BM25 score component
      score +=
        (idf * f * (this.k1 + 1)) /
        (f + this.k1 * (1 - this.b + this.b * (dl / this.avgdl)));
    }
    return score;
  }

  retrieve(query: string, topK: number): KnowledgeChunk[] {
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0 || this.chunks.length === 0) return [];

    const scored = this.chunks
      .map((_, i) => ({ i, score: this.scoreDoc(queryTerms, i) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored.map((s) => this.chunks[s.i]);
  }
}

// ── KnowledgeService (singleton) ─────────────────────────────────────────────

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
