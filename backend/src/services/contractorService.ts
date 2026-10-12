import prisma from '../db/prisma.js';
import { RAGIngestionService } from './rag/ragIngestionService.js';
import { AuditService } from './auditService.js';

export class ContractorService {
  static async getContractors() {
    const contractors = await prisma.contractor.findMany({
      include: {
        contracts: true,
        dailyReports: { take: 5, orderBy: { date: 'desc' } },
        boqItems: true,
        issues: true,
        progressNotes: { orderBy: { reportingDate: 'desc' } },
      },
      orderBy: { performanceScore: 'desc' },
    });

    // Dynamically evaluate performance metrics from actual database records
    return contractors.map((c) => {
      const totalIssues = c.issues.length;
      const resolvedIssues = c.issues.filter(i => ['RESOLVED', 'CLOSED'].includes(i.status)).length;
      const issueResolutionRate = totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 100;

      // BOQ cost variance check
      const totalBOQVariance = c.boqItems.reduce((acc, b) => acc + b.costVariance, 0);
      const boqPenalty = totalBOQVariance > 0 ? 5 : 0;

      // Dynamic Performance Score (Base 90 + Issue bonus/penalty - Variance penalty)
      const calculatedScore = Math.min(100, Math.max(50, Number((85 + (issueResolutionRate * 0.1) - boqPenalty).toFixed(1))));

      return {
        ...c,
        latestProgressNote: c.progressNotes[0] || null,
        metrics: {
          totalContracts: c.contracts.length,
          totalContractsValue: c.contracts.reduce((sum, ct) => sum + ct.totalValue, 0),
          totalIssues,
          resolvedIssues,
          openIssues: totalIssues - resolvedIssues,
          issueResolutionRate: Number(issueResolutionRate.toFixed(1)),
          calculatedScore,
          progressNotesCount: c.progressNotes.length,
        },
      };
    });
  }

  static async getContractorById(id: string) {
    return prisma.contractor.findUnique({
      where: { id },
      include: {
        contracts: { include: { project: true } },
        dailyReports: { orderBy: { date: 'desc' } },
        boqItems: true,
        issues: { orderBy: { createdAt: 'desc' } },
        progressNotes: { orderBy: { reportingDate: 'desc' } },
      },
    });
  }

  static async addProgressNote(contractorId: string, data: {
    workPackageTitle?: string;
    milestoneName?: string;
    progressPercent: number;
    status: string;
    reportingDate?: string | Date;
    progressNotes: string;
    manpowerDepl?: string;
    hasBlocker?: boolean;
    blockerDesc?: string;
    reportedTo?: string;
    blockerImpact?: string;
    submittedBy?: string;
  }) {
    const contractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
    if (!contractor) throw new Error('Contractor not found');

    const note = await prisma.contractorProgressNote.create({
      data: {
        contractorId,
        workPackageTitle: data.workPackageTitle || 'Main Scope Package',
        milestoneName: data.milestoneName || 'Site Progress Milestone',
        progressPercent: Number(data.progressPercent) || 0,
        status: data.status || 'IN_PROGRESS',
        reportingDate: data.reportingDate ? new Date(data.reportingDate) : new Date(),
        progressNotes: data.progressNotes,
        manpowerDepl: data.manpowerDepl || 'Regular crew deployed',
        hasBlocker: Boolean(data.hasBlocker),
        blockerDesc: data.blockerDesc || null,
        reportedTo: data.reportedTo || null,
        blockerImpact: data.blockerImpact || null,
        submittedBy: data.submittedBy || 'Contractor Lead',
        ragStatus: 'NOT_INDEXED',
      },
      include: { contractor: true },
    });

    // Auto RAG Ingestion into Vector Database
    let ragResult = { success: false, message: 'Deferred' };
    try {
      ragResult = await RAGIngestionService.ingestContractorProgressNote(note.id);
    } catch (err: any) {
      console.warn('RAG ingestion failed for contractor progress note:', err.message);
    }

    await AuditService.log({
      action: 'ADD_CONTRACTOR_PROGRESS_NOTE',
      module: 'CONTRACTORS',
      recordId: note.id,
      newValue: {
        contractorId,
        milestone: data.milestoneName,
        progressPercent: data.progressPercent,
        ragIndexed: ragResult.success,
      },
    });

    return {
      ...note,
      ragResult,
    };
  }

  static async getProgressNotes(contractorId?: string) {
    return prisma.contractorProgressNote.findMany({
      where: contractorId ? { contractorId } : undefined,
      include: { contractor: true },
      orderBy: { reportingDate: 'desc' },
    });
  }
}
