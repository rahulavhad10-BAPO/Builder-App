import { StructuredDataService } from './structuredDataService.js';
import { RAGRetrievalService } from './ragIngestionService.js';

export class AskProjectService {
  static async handleQuery(query: string, projectId?: string, userRole?: string) {
    // 1. First, check structured operational query engine
    const structuredResult = await StructuredDataService.answerStructuredQuery(query, projectId);
    if (structuredResult.matched) {
      return {
        queryType: 'STRUCTURED_RELATIONAL',
        success: true,
        answer: structuredResult.answer,
        data: structuredResult.data,
        drillDownRoute: structuredResult.drillDownRoute,
        sources: [
          {
            type: 'OPERATIONAL_RECORDS',
            documentName: 'Live Operational Project Records',
            timestamp: new Date(),
          },
        ],
      };
    }

    // 2. Unstructured query -> check RAG state
    const isRagEnabled = process.env.RAG_ENABLED === 'true';

    if (!isRagEnabled) {
      return {
        queryType: 'UNSTRUCTURED_DOCUMENT',
        success: false,
        ragConfigured: false,
        answer: 'AI/RAG is not configured yet. Vector retrieval and LLM embeddings are currently disabled.',
        note: 'The system is running in pure operational mode (RAG_ENABLED=false). You can ask structured queries like "Which material demands are overdue?", "How many flats are available?", "Which POs have mismatches?", or "What is the compliance percentage?".',
        sources: [],
      };
    }

    // 3. If RAG is enabled, query retrieval service
    const ragResult = await RAGRetrievalService.search(query, { projectId });

    return {
      queryType: 'UNSTRUCTURED_DOCUMENT',
      success: ragResult.status === 'SUCCESS',
      ragConfigured: true,
      answer: ragResult.answer || ragResult.message || 'No relevant document snippets retrieved.',
      sources: ragResult.sources,
    };
  }
}
