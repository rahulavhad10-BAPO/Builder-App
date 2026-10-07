export interface RAGDocumentMetadata {
  documentId: string;
  organizationId: string;
  projectId: string;
  buildingId?: string | null;
  documentType: string;
  category: string;
  version: number;
  permissions: string;
  rolesAllowed?: string[];
}

export interface RAGChunk {
  chunkId: string;
  documentId: string;
  content: string;
  metadata: RAGDocumentMetadata;
  vector?: number[];
}

export interface RAGQueryResult {
  answer?: string;
  sources: Array<{
    documentId: string;
    documentName: string;
    score: number;
    snippet: string;
    version: number;
  }>;
  status: 'SUCCESS' | 'RAG_DISABLED' | 'PROVIDER_NOT_CONFIGURED';
  message?: string;
}

export interface IRAGProvider {
  name: string;
  isConfigured(): boolean;
  ingest(documentId: string, metadata: RAGDocumentMetadata, content: Buffer | string): Promise<{ status: string; ragDocumentId?: string; error?: string }>;
  delete(documentId: string): Promise<boolean>;
  retrieve(query: string, filters?: Partial<RAGDocumentMetadata>): Promise<RAGQueryResult>;
}
