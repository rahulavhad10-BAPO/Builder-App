import prisma from '../db/prisma.js';
import { RAGIngestionService } from './rag/ragIngestionService.js';

export class OperationsService {
  // DRAWINGS
  static async getDrawings(filters?: { projectId?: string; category?: string; status?: string }) {
    return prisma.drawing.findMany({
      where: {
        projectId: filters?.projectId || undefined,
        category: filters?.category || undefined,
        status: filters?.status || undefined,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true, code: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  static async createDrawing(data: {
    drawingNumber: string;
    name: string;
    revision: string;
    projectId: string;
    buildingId?: string;
    category: string;
    fileUrl: string;
    uploadedBy: string;
  }) {
    const drawing = await prisma.drawing.create({
      data: {
        drawingNumber: data.drawingNumber,
        name: data.name,
        revision: data.revision,
        projectId: data.projectId,
        buildingId: data.buildingId || null,
        category: data.category,
        fileUrl: data.fileUrl,
        uploadedBy: data.uploadedBy,
        status: 'APPROVED',
      },
    });

    if (process.env.RAG_ENABLED === 'true') {
      try {
        await RAGIngestionService.ingestDrawing(drawing.id);
      } catch (err) {
        console.warn('Auto RAG drawing ingestion deferred:', err);
      }
    }

    return drawing;
  }

  // DAILY REPORTING
  static async getDailyReports(filters?: { projectId?: string; contractorId?: string }) {
    return prisma.dailyReport.findMany({
      where: {
        projectId: filters?.projectId || undefined,
        contractorId: filters?.contractorId || undefined,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true, code: true } },
        contractor: { select: { id: true, name: true, code: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  static async createDailyReport(data: any) {
    const report = await prisma.dailyReport.create({
      data: {
        ...data,
        date: new Date(data.date),
      },
      include: {
        contractor: true,
        building: true,
        project: true,
      },
    });

    if (process.env.RAG_ENABLED === 'true') {
      try {
        await RAGIngestionService.ingestDailyReport(report.id);
      } catch (err) {
        console.warn('Auto RAG daily report ingestion deferred:', err);
      }
    }

    return report;
  }

  // MONTHLY REPORTING
  static async getMonthlyReports(projectId?: string) {
    return prisma.monthlyReport.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  // ISSUES, SNAGS & RFIS
  static async getIssuesSnagsRFIs(filters?: { type?: string; priority?: string; status?: string; projectId?: string }) {
    return prisma.issueSnagRfi.findMany({
      where: {
        type: filters?.type || undefined,
        priority: filters?.priority || undefined,
        status: filters?.status || undefined,
        projectId: filters?.projectId || undefined,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true, code: true } },
        contractor: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
  }

  static async updateIssueStatus(id: string, status: string, resolution?: string) {
    return prisma.issueSnagRfi.update({
      where: { id },
      data: {
        status,
        resolution: resolution || undefined,
      },
    });
  }

  // MEETINGS & ACTIONS
  static async getMeetings(projectId?: string) {
    return prisma.meeting.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        project: { select: { id: true, name: true, code: true } },
        decisions: true,
        actions: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  // BROKERS & BROKER INTELLIGENCE
  static async getBrokers() {
    const brokers = await prisma.broker.findMany({
      include: {
        flats: {
          include: {
            building: true,
            project: true,
            customer: true,
            payments: { where: { status: 'VERIFIED' } },
          },
        },
        customers: true,
      },
      orderBy: { name: 'asc' },
    });

    return brokers.map((b) => {
      const bookedFlats = b.flats.filter(f => ['SOLD', 'AGREEMENT', 'BOOKED', 'POSSESSION', 'REGISTERED', 'AVAILABLE'].includes(f.status));
      const totalBookingValue = bookedFlats.reduce((sum, f) => sum + (f.agreementValue || 0), 0);
      const totalCommission = (totalBookingValue * b.commissionRate) / 100;
      const totalCollected = bookedFlats.flatMap(f => f.payments).reduce((sum, p) => sum + p.amount, 0);
      const paidCommission = (totalCollected * b.commissionRate) / 100;
      const pendingCommission = Math.max(0, totalCommission - paidCommission);

      const enrichedFlats = bookedFlats.map((f) => {
        const unitBrokerage = ((f.agreementValue || 0) * b.commissionRate) / 100;
        const flatPaid = f.payments.reduce((s, p) => s + p.amount, 0);
        const commissionPaidOnUnit = ((flatPaid || 0) * b.commissionRate) / 100;

        return {
          id: f.id,
          unitNumber: f.unitNumber,
          project: f.project?.name || 'Skyline Heights',
          tower: f.building?.name || 'Main Tower',
          saleDate: f.createdAt.toISOString().split('T')[0],
          customerName: f.customer?.name || 'Buyer Assigned',
          unitAmount: f.agreementValue || 0,
          brokeragePercent: b.commissionRate,
          totalBrokerage: unitBrokerage,
          amountPaid: commissionPaidOnUnit,
          balanceBrokerage: Math.max(0, unitBrokerage - commissionPaidOnUnit),
          status: f.status,
        };
      });

      return {
        ...b,
        soldUnits: enrichedFlats,
        metrics: {
          totalBookings: bookedFlats.length,
          totalCustomers: b.customers.length,
          totalBookingValue,
          commissionRate: b.commissionRate,
          totalCommission,
          paidCommission,
          pendingCommission,
        },
      };
    });
  }
}
