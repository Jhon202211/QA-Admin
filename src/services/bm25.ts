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
export function tokenize(text: string): string[] {
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
export function chunkText(
  text: string,
  source: string,
  chunkSize = 400,
  overlap = 50
): KnowledgeChunk[] {
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
 *
 * Motor genérico reutilizado por los distintos knowledge bases de la app
 * (agente de generación de casos de prueba, OpenLaila, etc.).
 */
export class BM25Index {
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
