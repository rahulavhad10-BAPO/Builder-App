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

  static async ingestContractorProgressNote(noteId: string): Promise<{ success: boolean; status: string; message: string }> {
    const note = await prisma.contractorProgressNote.findUnique({
      where: { id: noteId },
      include: { contractor: true },
    });
    if (!note) throw new Error('Contractor progress note not found');

    if (!this.isRAGEnabled()) {
      return { success: false, status: 'NOT_INDEXED', message: 'RAG disabled in configuration' };
    }

    try {
      const formattedDate = new Date(note.reportingDate).toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const chunkContent =
        `[CONTRACTOR PROGRESS REPORT & EXECUTION STATUS]\n` +
        `Contractor: ${note.contractor.name} (${note.contractor.code})\n` +
        `Specialized Scope: ${note.contractor.scope}\n` +
        `Work Package: ${note.workPackageTitle || 'General Construction Scope'}\n` +
        `Key Milestone: ${note.milestoneName || 'Site Progress Milestone'}\n` +
        `Progress Percentage: ${note.progressPercent}% Completed\n` +
        `Schedule Health & Status: ${note.status}\n` +
        `Reporting Date: ${formattedDate}\n` +
        `Submitted By: ${note.submittedBy}\n` +
        `Manpower & Machinery Deployed: ${note.manpowerDepl || 'Regular crew deployed'}\n` +
        `Progress Notes & Achievements: ${note.progressNotes}\n` +
        `Site Blockers & Delays: ${
          note.hasBlocker
            ? `CRITICAL BLOCKER REPORTED: ${note.blockerDesc}. Escalated to: ${note.reportedTo || 'Project Management'}. Delay Impact: ${note.blockerImpact || 'Under review'}.`
            : 'Zero blockers reported. Work proceeding on schedule.'
        }`;

      // Remove existing chunk for this contractor note if any
      await prisma.documentChunk.deleteMany({
        where: { contractorNoteId: note.id },
      });

      const embedding = await VectorStore.generateEmbedding(chunkContent);

      const metadata = {
        sourceType: 'CONTRACTOR_PROGRESS',
        title: `${note.contractor.name} - Progress Report (${note.milestoneName || 'Milestone Update'})`,
        category: 'CONTRACTOR_PROGRESS',
        contractorId: note.contractorId,
        contractorName: note.contractor.name,
        milestoneName: note.milestoneName,
        progressPercent: note.progressPercent,
        status: note.status,
        date: note.reportingDate.toISOString(),
        version: 1,
      };

      const chunk = await prisma.documentChunk.create({
        data: {
          contractorNoteId: note.id,
          chunkIndex: 0,
          content: chunkContent,
          embedding: JSON.stringify(embedding),
          metadata: JSON.stringify(metadata),
        },
      });

      await prisma.contractorProgressNote.update({
        where: { id: noteId },
        data: {
          ragStatus: 'INDEXED',
          ragChunkId: chunk.id,
        },
      });

      return {
        success: true,
        status: 'INDEXED',
        message: 'Contractor progress note successfully chunked and indexed into RAG vector engine',
      };
    } catch (err: any) {
      console.error('Failed to ingest contractor progress note:', err);
      return { success: false, status: 'FAILED', message: err.message };
    }
  }

  static async ingestDailyReport(reportId: string): Promise<{ success: boolean; status: string; message: string }> {
    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: { contractor: true, building: true, project: true },
    });
    if (!report) throw new Error('Daily report not found');

    if (!this.isRAGEnabled()) {
      return { success: false, status: 'NOT_INDEXED', message: 'RAG disabled in configuration' };
    }

    try {
      const formattedDate = new Date(report.date).toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const chunkContent =
        `[DAILY PROGRESS REPORT (DPR) - SITE EXECUTION RECORD]\n` +
        `Date: ${formattedDate}\n` +
        `Tower / Structure: ${report.building?.name || 'Main Tower Structure'}\n` +
        `Contractor: ${report.contractor?.name || 'Contractor'} (${report.contractor?.scope || 'Execution Scope'})\n` +
        `Manpower Deployed: ${report.manpower} Pax\n` +
        `Weather: ${report.weather}\n` +
        `Planned Work for Day: ${report.plannedWork}\n` +
        `Work Achieved End of Day (EoD): ${report.completedWork}\n` +
        `Pending / Delayed Work: ${report.delayedWork || 'None'}\n` +
        `Safety Adherence: ${report.safety || 'Zero incidents / PPE verified'}\n` +
        `Site Blocker & Risk: ${
          report.hasBlocker || (report.blockerDesc && report.blockerDesc.trim().length > 0)
            ? `⚠️ CRITICAL SITE BLOCKER: ${report.blockerDesc}. Escalated to: ${report.reportedTo || 'Project Lead'}. Delay Impact: ${report.blockerImpact || 'Under assessment'}.`
            : report.issues && report.issues !== 'None'
            ? `Site Issue: ${report.issues}`
            : '✅ Zero site blockers reported; execution on schedule.'
        }\n` +
        `Submitted By: ${report.submittedBy}`;

      // Remove existing chunk for this daily report if any
      await prisma.documentChunk.deleteMany({
        where: { dailyReportId: report.id },
      });

      const embedding = await VectorStore.generateEmbedding(chunkContent);

      const metadata = {
        sourceType: 'DAILY_REPORT',
        title: `DPR: ${report.building?.name || 'Site'} - ${report.contractor?.name || 'Contractor'} (${formattedDate})`,
        category: 'DAILY_REPORT',
        tower: report.building?.name,
        buildingId: report.buildingId,
        contractorId: report.contractorId,
        contractorName: report.contractor?.name,
        date: report.date.toISOString(),
        manpower: report.manpower,
        hasBlocker: report.hasBlocker,
        version: 1,
      };

      const chunk = await prisma.documentChunk.create({
        data: {
          dailyReportId: report.id,
          chunkIndex: 0,
          content: chunkContent,
          embedding: JSON.stringify(embedding),
          metadata: JSON.stringify(metadata),
        },
      });

      await prisma.dailyReport.update({
        where: { id: reportId },
        data: {
          ragStatus: 'INDEXED',
          ragChunkId: chunk.id,
        },
      });

      return {
        success: true,
        status: 'INDEXED',
        message: 'Daily progress report successfully indexed into RAG vector engine',
      };
    } catch (err: any) {
      console.error('Failed to ingest daily report:', err);
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

  static async reindexAll(): Promise<{ documentsIndexed: number; drawingsIndexed: number; dailyReportsIndexed: number }> {
    const docs = await prisma.document.findMany({ where: { status: 'ACTIVE' } });
    const drawings = await prisma.drawing.findMany();
    const dailyReports = await prisma.dailyReport.findMany();

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

    let dprCount = 0;
    for (const dpr of dailyReports) {
      await this.ingestDailyReport(dpr.id);
      dprCount++;
    }

    return { documentsIndexed: docCount, drawingsIndexed: drawingCount, dailyReportsIndexed: dprCount };
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
