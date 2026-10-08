import prisma from '../../db/prisma.js';
import { DatabaseVectorProvider, GoogleRAGProvider, PineconeProvider, VertexAISearchProvider } from './providers.js';
import { IRAGProvider, RAGDocumentMetadata, RAGQueryResult } from './types.js';
import { DocumentChunker } from './chunker.js';
import { VectorStore } from './vectorStore.js';

export class RAGIngestionService {
  private static provider: IRAGProvider = new DatabaseVectorProvider();

  static setProvider(provider: IRAGProvider) {
    this.provider = provider;
  }

  static getProvider(): IRAGProvider {
    return this.provider;
  }

  static isRAGEnabled(): boolean {
    return process.env.RAG_ENABLED === 'true' && this.provider.isConfigured();
  }

  static async ingestDocument(documentId: string): Promise<{ success: boolean; status: string; message: string }> {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');

    if (!this.isRAGEnabled()) {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          ragEnabled: false,
          ragStatus: 'NOT_INDEXED',
          indexingError: 'RAG_ENABLED is false in configuration.',
        },
      });

      return {
        success: false,
        status: 'NOT_INDEXED',
        message: 'RAG provider disabled. Vector indexing deferred.',
      };
    }

    const metadata: RAGDocumentMetadata = {
      documentId: doc.id,
      organizationId: doc.organizationId,
      projectId: doc.projectId,
      buildingId: doc.buildingId,
      documentType: doc.type,
      category: doc.category,
      version: doc.version,
      permissions: doc.permissions,
    };

    const result = await this.provider.ingest(doc.id, metadata, doc.storageReference);

    await prisma.document.update({
      where: { id: documentId },
      data: {
        ragEnabled: true,
        ragStatus: result.status,
        ragDocumentId: result.ragDocumentId || null,
        ragProvider: this.provider.name,
        lastIndexedAt: result.status === 'INDEXED' ? new Date() : null,
        indexingError: result.error || null,
      },
    });

    return {
      success: result.status === 'INDEXED',
      status: result.status,
      message: result.error || 'Document chunked and vector indexed successfully',
    };
  }

  static async ingestDrawing(drawingId: string): Promise<{ success: boolean; status: string; message: string }> {
    const drawing = await prisma.drawing.findUnique({ where: { id: drawingId } });
    if (!drawing) throw new Error('Drawing not found');

    if (!this.isRAGEnabled()) {
      return { success: false, status: 'NOT_INDEXED', message: 'RAG disabled' };
    }

    try {
      const chunks = DocumentChunker.processDrawing({
        id: drawing.id,
        drawingNumber: drawing.drawingNumber,
        name: drawing.name,
        revision: drawing.revision,
        category: drawing.category,
        projectId: drawing.projectId,
        buildingId: drawing.buildingId,
        fileUrl: drawing.fileUrl,
        uploadedBy: drawing.uploadedBy,
      });

      await VectorStore.clearDrawingChunks(drawing.id);

      const chunksWithEmbeddings = [];
      for (const chunk of chunks) {
        const embedding = await VectorStore.generateEmbedding(chunk.content);
        chunksWithEmbeddings.push({
          drawingId: drawing.id,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          embedding,
          metadata: chunk.metadata,
        });
      }

      await VectorStore.storeChunks(chunksWithEmbeddings);

      await prisma.drawing.update({
        where: { id: drawingId },
        data: {
          ragStatus: 'INDEXED',
          lastIndexedAt: new Date(),
        },
      });

      return { success: true, status: 'INDEXED', message: 'Drawing indexed into vector store' };
    } catch (err: any) {
      return { success: false, status: 'FAILED', message: err.message };
    }
  }

  static async updateDocument(documentId: string) {
    return this.ingestDocument(documentId);
  }

  static async deleteDocument(documentId: string) {
    if (this.isRAGEnabled()) {
      await this.provider.delete(documentId);
    }
  }

  static async reindexDocument(documentId: string) {
    return this.ingestDocument(documentId);
  }

  static async reindexAll(): Promise<{ documentsIndexed: number; drawingsIndexed: number }> {
    const docs = await prisma.document.findMany({ where: { status: 'ACTIVE' } });
    const drawings = await prisma.drawing.findMany();

    let docCount = 0;
    for (const d of docs) {
      await this.ingestDocument(d.id);
      docCount++;
    }

    let drawingCount = 0;
    for (const dwg of drawings) {
      await this.ingestDrawing(dwg.id);
      drawingCount++;
    }

    return { documentsIndexed: docCount, drawingsIndexed: drawingCount };
  }

  static async getIndexingStatus(documentId: string) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        ragEnabled: true,
        ragStatus: true,
        ragDocumentId: true,
        ragProvider: true,
        lastIndexedAt: true,
        indexingError: true,
      },
    });
    return doc;
  }
}

export class RAGRetrievalService {
  private static provider: IRAGProvider = new DatabaseVectorProvider();

  static setProvider(provider: IRAGProvider) {
    this.provider = provider;
  }

  static async search(query: string, filters?: Partial<RAGDocumentMetadata>): Promise<RAGQueryResult> {
    if (process.env.RAG_ENABLED !== 'true' || !this.provider.isConfigured()) {
      return {
        status: 'RAG_DISABLED',
        sources: [],
        answer: 'AI/RAG is not active. Enable RAG_ENABLED=true in environment or admin settings.',
        message: 'Vector retrieval disabled.',
      };
    }

    return this.provider.retrieve(query, filters);
  }
}
