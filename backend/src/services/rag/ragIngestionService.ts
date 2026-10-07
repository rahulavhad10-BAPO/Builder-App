import prisma from '../../db/prisma.js';
import { GoogleRAGProvider, PineconeProvider, VertexAISearchProvider } from './providers.js';
import { IRAGProvider, RAGDocumentMetadata, RAGQueryResult } from './types.js';

export class RAGIngestionService {
  private static provider: IRAGProvider = new GoogleRAGProvider();

  static setProvider(provider: IRAGProvider) {
    this.provider = provider;
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
          indexingError: 'RAG provider not configured.',
        },
      });

      return {
        success: false,
        status: 'NOT_INDEXED',
        message: 'RAG provider not configured. Vector indexing deferred.',
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
      message: result.error || 'Document indexed successfully',
    };
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
  private static provider: IRAGProvider = new GoogleRAGProvider();

  static async search(query: string, filters?: Partial<RAGDocumentMetadata>): Promise<RAGQueryResult> {
    if (process.env.RAG_ENABLED !== 'true' || !this.provider.isConfigured()) {
      return {
        status: 'RAG_DISABLED',
        sources: [],
        message: 'AI/RAG is not configured yet. Set RAG_ENABLED=true and configure your vector search provider in Admin settings.',
      };
    }

    return this.provider.retrieve(query, filters);
  }
}
