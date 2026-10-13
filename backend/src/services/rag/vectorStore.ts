import prisma from '../../db/prisma.js';

export interface ScoredChunk {
  chunkId: string;
  documentId?: string | null;
  drawingId?: string | null;
  contractorNoteId?: string | null;
  dailyReportId?: string | null;
  content: string;
  score: number;
  metadata: {
    sourceType: 'DOCUMENT' | 'DRAWING' | 'CONTRACTOR_PROGRESS' | 'DAILY_REPORT' | string;
    documentId?: string;
    drawingId?: string;
    contractorNoteId?: string;
    dailyReportId?: string;
    title: string;
    category: string;
    projectId?: string;
    buildingId?: string | null;
    version?: number | string;
    chunkIndex: number;
    totalChunks: number;
    [key: string]: any;
  };
}

export class VectorStore {
  public static VECTOR_DIMENSIONS = 384;

  /**
   * Generates a 384-dimensional dense semantic feature embedding vector
   * with L2 unit normalization.
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    // Optional external Gemini API integration if key provided
    const apiKey = process.env.GOOGLE_RAG_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/text-embedding-004',
              content: { parts: [{ text: text.slice(0, 2048) }] },
            }),
          }
        );
        if (response.ok) {
          const data = (await response.json()) as any;
          if (data.embedding?.values) {
            return data.embedding.values;
          }
        }
      } catch {
        // Fallback to local semantic vectorizer if network or key fails
      }
    }

    return this.generateLocalDenseEmbedding(text);
  }

  /**
   * Deterministic local dense semantic vectorizer
   * Utilizes subword n-grams, lexical frequency, positional weights, and construction domain ontologies.
   */
  static generateLocalDenseEmbedding(text: string): number[] {
    const vector = new Float32Array(this.VECTOR_DIMENSIONS);
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s_\-\.\/]/g, ' ');
    const tokens = normalized.split(/\s+/).filter(Boolean);

    if (tokens.length === 0) {
      return Array.from(vector);
    }

    // High-importance domain construction keywords receive amplified semantic projection
    const domainWeights: Record<string, number> = {
      fire: 3.5,
      noc: 4.0,
      safety: 3.0,
      cfo: 4.0,
      approval: 3.2,
      provisional: 3.0,
      hydrant: 3.5,
      sprinkler: 3.5,
      riser: 3.2,
      contract: 3.0,
      agreement: 3.0,
      penalty: 4.0,
      penalties: 4.0,
      liquidated: 4.0,
      damages: 4.0,
      clause: 3.5,
      liability: 3.2,
      retention: 3.2,
      guarantee: 3.0,
      structural: 3.2,
      rcc: 3.5,
      rebar: 3.5,
      concrete: 3.0,
      drawing: 3.0,
      boq: 3.5,
      specifications: 3.0,
      drawingnumber: 3.5,
      revision: 3.0,
      per: 1.0,
      week: 1.5,
      percent: 2.0,
      delay: 3.5,
      delayed: 3.5,
      overdue: 3.5,
      compliance: 3.5,
      tower: 2.0,
      building: 2.0,
      flats: 2.0,
      flat: 2.0,
      demand: 2.5,
      payment: 2.5,
      progress: 3.5,
      contractor: 3.5,
      milestone: 3.5,
      notes: 3.0,
      report: 3.0,
      blocker: 3.5,
      elevator: 3.5,
      elevators: 3.5,
      traction: 3.5,
      rail: 3.5,
      hoist: 3.0,
      alignment: 3.5,
      motor: 3.0,
      kone: 4.0,
      sterling: 4.0,
      wilson: 4.0,
      larsen: 4.0,
      toubro: 4.0,
    };

    // 1. Unigram feature hashing
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const weight = (domainWeights[token] || 1.0) * (1.0 + 1.0 / (i + 1));

      // Hash token into primary dimension
      const h1 = this.hashString(token) % this.VECTOR_DIMENSIONS;
      const h2 = this.hashString(`rev_${token}`) % this.VECTOR_DIMENSIONS;
      vector[h1] += (weight as number);
      vector[h2] += ((weight as number) * 0.5);

      // Subword character n-grams (trigrams)
      if (token.length >= 3) {
        for (let j = 0; j <= token.length - 3; j++) {
          const trigram = token.slice(j, j + 3);
          const triHash = this.hashString(`tri_${trigram}`) % this.VECTOR_DIMENSIONS;
          vector[triHash] += 0.35;
        }
      }

      // Bigram feature hashing
      if (i < tokens.length - 1) {
        const bigram = `${token}_${tokens[i + 1]}`;
        const biWeight = ((domainWeights[token] || 1.0) + (domainWeights[tokens[i + 1]] || 1.0));
        const biHash = this.hashString(`bi_${bigram}`) % this.VECTOR_DIMENSIONS;
        vector[biHash] += biWeight * 1.5;
      }
    }

    // 2. L2 Unit Normalization (so cosine similarity is simple dot product)
    let sumSq = 0;
    for (let i = 0; i < this.VECTOR_DIMENSIONS; i++) {
      sumSq += vector[i] * vector[i];
    }

    const norm = Math.sqrt(sumSq) || 1.0;
    const result: number[] = new Array(this.VECTOR_DIMENSIONS);
    for (let i = 0; i < this.VECTOR_DIMENSIONS; i++) {
      result[i] = Number((vector[i] / norm).toFixed(6));
    }

    return result;
  }

  private static hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash >>> 0);
  }

  /**
   * Fast Dot Product Cosine Similarity between two L2-normalized unit vectors
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
    }
    return Math.max(0, Math.min(1, dot));
  }

  /**
   * Store chunks into the database vector table
   */
  static async storeChunks(
    chunks: Array<{
      documentId?: string;
      drawingId?: string;
      chunkIndex: number;
      content: string;
      embedding: number[];
      metadata: any;
    }>
  ) {
    if (chunks.length === 0) return;

    for (const chunk of chunks) {
      await prisma.documentChunk.create({
        data: {
          documentId: chunk.documentId || null,
          drawingId: chunk.drawingId || null,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          embedding: JSON.stringify(chunk.embedding),
          metadata: JSON.stringify(chunk.metadata),
        },
      });
    }
  }

  /**
   * Remove chunks for a document
   */
  static async clearDocumentChunks(documentId: string) {
    await prisma.documentChunk.deleteMany({
      where: { documentId },
    });
  }

  /**
   * Remove chunks for a drawing
   */
  static async clearDrawingChunks(drawingId: string) {
    await prisma.documentChunk.deleteMany({
      where: { drawingId },
    });
  }

  /**
   * Similarity search across all stored chunks in database
   */
  static async searchSimilarChunks(
    query: string,
    options?: {
      projectId?: string;
      limit?: number;
      minScore?: number;
    }
  ): Promise<ScoredChunk[]> {
    const limit = options?.limit || 5;
    const minScore = options?.minScore || 0.12;

    const queryEmbedding = await this.generateEmbedding(query);

    // Fetch all candidate chunks
    const allChunks = await prisma.documentChunk.findMany({
      include: {
        document: {
          select: { id: true, name: true, category: true, version: true, projectId: true },
        },
        drawing: {
          select: { id: true, drawingNumber: true, name: true, category: true, revision: true, projectId: true },
        },
      },
    });

    const scored: ScoredChunk[] = [];

    for (const chunk of allChunks) {
      // Filter by project if specified
      if (options?.projectId) {
        const chunkProjectId = chunk.document?.projectId || chunk.drawing?.projectId;
        if (chunkProjectId && chunkProjectId !== options.projectId) {
          continue;
        }
      }

      let embeddingVec: number[] = [];
      try {
        embeddingVec = JSON.parse(chunk.embedding);
      } catch {
        continue;
      }

      const cosineScore = this.cosineSimilarity(queryEmbedding, embeddingVec);

      // Keyword & token overlap feature
      const qTerms = query.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(t => t.length > 2);
      const contentLower = chunk.content.toLowerCase();
      let termHits = 0;
      for (const term of qTerms) {
        if (contentLower.includes(term)) termHits += 1;
      }
      const keywordRatio = qTerms.length > 0 ? (termHits / qTerms.length) : 0;
      const hybridScore = (0.55 * cosineScore) + (0.45 * keywordRatio);

      if (hybridScore >= minScore || cosineScore >= minScore) {
        let meta: any = {};
        try {
          meta = JSON.parse(chunk.metadata || '{}');
        } catch {
          meta = {};
        }

        const title = chunk.document?.name || (chunk.drawing ? `${chunk.drawing.drawingNumber} - ${chunk.drawing.name}` : meta.title || 'Document Record');
        const category = chunk.document?.category || chunk.drawing?.category || meta.category || 'GENERAL';
        const version = chunk.document?.version || chunk.drawing?.revision || meta.version || 1;

        const finalScore = Math.max(cosineScore, hybridScore);

        scored.push({
          chunkId: chunk.id,
          documentId: chunk.documentId,
          drawingId: chunk.drawingId,
          contractorNoteId: chunk.contractorNoteId,
          dailyReportId: (chunk as any).dailyReportId,
          content: chunk.content,
          score: Number(finalScore.toFixed(4)),
          metadata: {
            sourceType: chunk.documentId
              ? 'DOCUMENT'
              : chunk.drawingId
              ? 'DRAWING'
              : (chunk as any).dailyReportId
              ? 'DAILY_REPORT'
              : (meta.sourceType || 'CONTRACTOR_PROGRESS'),
            documentId: chunk.documentId || undefined,
            drawingId: chunk.drawingId || undefined,
            contractorNoteId: chunk.contractorNoteId || undefined,
            dailyReportId: (chunk as any).dailyReportId || undefined,
            title,
            category,
            projectId: chunk.document?.projectId || chunk.drawing?.projectId || meta.projectId,
            version,
            chunkIndex: chunk.chunkIndex,
            totalChunks: meta.totalChunks || 1,
            ...meta,
          },
        });
      }
    }

    // Sort descending by similarity score
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  }
}
