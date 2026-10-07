import prisma from '../db/prisma.js';
import { AuditService } from './auditService.js';

export class ComplianceService {
  static async getChecklist(filters?: { projectId?: string; category?: string; status?: string }) {
    return prisma.complianceItem.findMany({
      where: {
        projectId: filters?.projectId || undefined,
        category: filters?.category || undefined,
        status: filters?.status || undefined,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
  }

  static async getComplianceSummary(projectId?: string) {
    const items = await prisma.complianceItem.findMany({
      where: projectId ? { projectId } : undefined,
    });

    const applicableItems = items.filter(i => i.status !== 'NOT_APPLICABLE');
    const totalApplicable = applicableItems.length;
    const completed = applicableItems.filter(i => i.status === 'COMPLETED').length;
    const inProgress = applicableItems.filter(i => i.status === 'IN_PROGRESS').length;
    const pending = applicableItems.filter(i => i.status === 'PENDING').length;
    const overdue = applicableItems.filter(i => i.status === 'OVERDUE' || (new Date(i.dueDate) < new Date() && i.status !== 'COMPLETED')).length;
    const notApplicable = items.filter(i => i.status === 'NOT_APPLICABLE').length;

    const compliancePercentage = totalApplicable > 0 ? Number(((completed / totalApplicable) * 100).toFixed(1)) : 100;

    return {
      totalItems: items.length,
      totalApplicable,
      completed,
      inProgress,
      pending,
      overdue,
      notApplicable,
      compliancePercentage,
    };
  }

  static async updateStatus(id: string, status: string, remarks?: string, evidence?: string, userId?: string) {
    const existing = await prisma.complianceItem.findUnique({ where: { id } });
    if (!existing) throw new Error('Compliance item not found');

    const updated = await prisma.complianceItem.update({
      where: { id },
      data: {
        status,
        remarks: remarks !== undefined ? remarks : existing.remarks,
        evidence: evidence !== undefined ? evidence : existing.evidence,
      },
    });

    await AuditService.log({
      userId,
      action: 'UPDATE_COMPLIANCE_STATUS',
      module: 'COMPLIANCE',
      recordId: id,
      previousValue: { status: existing.status },
      newValue: { status, remarks, evidence },
    });

    return updated;
  }
}
