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

  static async createComplianceItem(data: {
    name: string;
    category: string;
    description: string;
    projectId: string;
    buildingId?: string;
    ownerName: string;
    dueDate: Date;
    frequency?: string;
    checklists?: Array<{ id: string; label: string; checked: boolean }>;
    docUrl?: string;
  }) {
    const initialChecklists = data.checklists && data.checklists.length > 0
      ? data.checklists
      : [
          { id: 'c1', label: 'Technical documentation & statutory application submission', checked: false },
          { id: 'c2', label: 'Competent authority on-site physical inspection', checked: false },
          { id: 'c3', label: 'Scrutiny fee verification & NOC / endorsement issuance', checked: false },
        ];

    const item = await prisma.complianceItem.create({
      data: {
        name: data.name,
        category: data.category,
        description: data.description,
        projectId: data.projectId,
        buildingId: data.buildingId || null,
        ownerName: data.ownerName,
        dueDate: data.dueDate,
        frequency: data.frequency || 'ONE_TIME',
        status: 'PENDING',
        checklists: JSON.stringify(initialChecklists),
        progressPercent: 0,
        docUrl: data.docUrl || null,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true, code: true } },
      },
    });

    return item;
  }

  static async updateStatus(
    id: string,
    status?: string,
    remarks?: string,
    evidence?: string,
    userId?: string,
    checklists?: any[],
    progressPercent?: number,
    docUrl?: string
  ) {
    const existing = await prisma.complianceItem.findUnique({ where: { id } });
    if (!existing) throw new Error('Compliance item not found');

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (evidence !== undefined) updateData.evidence = evidence;
    if (docUrl !== undefined) updateData.docUrl = docUrl;

    if (checklists !== undefined) {
      updateData.checklists = JSON.stringify(checklists);
      const total = checklists.length;
      const checked = checklists.filter(c => c.checked).length;
      const calcPct = total > 0 ? Math.round((checked / total) * 100) : 0;
      updateData.progressPercent = progressPercent !== undefined ? progressPercent : calcPct;
      if (updateData.progressPercent === 100) {
        updateData.status = 'COMPLETED';
      } else if (updateData.progressPercent > 0) {
        updateData.status = 'IN_PROGRESS';
      }
    } else if (progressPercent !== undefined) {
      updateData.progressPercent = progressPercent;
    }

    const updated = await prisma.complianceItem.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true, code: true } },
      },
    });

    await AuditService.log({
      userId,
      action: 'UPDATE_COMPLIANCE_STATUS',
      module: 'COMPLIANCE',
      recordId: id,
      previousValue: { status: existing.status },
      newValue: { status: updated.status, progressPercent: updated.progressPercent, remarks },
    });

    return updated;
  }

  static async addChecklistItem(id: string, label: string, targetDate?: string, remark?: string) {
    const item = await prisma.complianceItem.findUnique({ where: { id } });
    if (!item) throw new Error('Compliance item not found');

    let currentChecklist: Array<{
      id: string;
      label: string;
      checked: boolean;
      targetDate?: string;
      remark?: string;
      docUrl?: string;
      docName?: string;
    }> = [];
    try {
      currentChecklist = item.checklists ? JSON.parse(item.checklists) : [];
    } catch {
      currentChecklist = [];
    }

    const newItem = {
      id: `chk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      label: label.trim(),
      checked: false,
      targetDate: targetDate || item.dueDate.toISOString().split('T')[0],
      remark: remark || '',
      docUrl: '',
      docName: '',
    };

    const updatedList = [...currentChecklist, newItem];
    const total = updatedList.length;
    const checked = updatedList.filter(c => c.checked).length;
    const calcPct = total > 0 ? Math.round((checked / total) * 100) : 0;

    return prisma.complianceItem.update({
      where: { id },
      data: {
        checklists: JSON.stringify(updatedList),
        progressPercent: calcPct,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true, code: true } },
      },
    });
  }
}
