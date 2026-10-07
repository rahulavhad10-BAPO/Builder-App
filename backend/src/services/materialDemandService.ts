import prisma from '../db/prisma.js';
import { AuditService } from './auditService.js';
import { NotificationEmailService } from './notificationEmailService.js';

export class MaterialDemandService {
  static async getDemands(filters?: {
    projectId?: string;
    status?: string;
    priority?: string;
    overdueOnly?: boolean;
    search?: string;
  }) {
    // Dynamically evaluate overdue status for all pending demands
    await this.refreshOverdueStatus();

    const where: any = {};
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.overdueOnly) where.isOverdue = true;
    if (filters?.search) {
      where.OR = [
        { demandNumber: { contains: filters.search } },
        { ownerName: { contains: filters.search } },
        { item: { name: { contains: filters.search } } },
      ];
    }

    return prisma.materialDemand.findMany({
      where,
      include: {
        item: true,
        project: { select: { id: true, name: true, code: true } },
        purchaseOrders: {
          include: {
            vendor: true,
            exceptions: true,
          },
        },
      },
      orderBy: [{ isOverdue: 'desc' }, { requiredDate: 'asc' }],
    });
  }

  static async createDemand(data: {
    itemId: string;
    quantity: number;
    projectId: string;
    requesterName: string;
    requiredDate: Date;
    ownerName: string;
    procurementPerson: string;
    priority?: string;
  }) {
    const count = await prisma.materialDemand.count();
    const demandNumber = `MD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const isOverdue = new Date(data.requiredDate) < new Date();

    const demand = await prisma.materialDemand.create({
      data: {
        demandNumber,
        itemId: data.itemId,
        quantity: data.quantity,
        projectId: data.projectId,
        requesterName: data.requesterName,
        requiredDate: new Date(data.requiredDate),
        ownerName: data.ownerName,
        procurementPerson: data.procurementPerson,
        priority: data.priority || 'MEDIUM',
        status: isOverdue ? 'OVERDUE' : 'REQUESTED',
        isOverdue,
      },
      include: { item: true, project: true },
    });

    await AuditService.log({
      action: 'CREATE_MATERIAL_DEMAND',
      module: 'MATERIAL_DEMAND',
      recordId: demand.id,
      newValue: { demandNumber, quantity: demand.quantity, item: demand.item.name },
    });

    return demand;
  }

  static async updateStatus(demandId: string, status: string, userId?: string) {
    const existing = await prisma.materialDemand.findUnique({
      where: { id: demandId },
    });

    if (!existing) throw new Error('Material demand not found');

    const updated = await prisma.materialDemand.update({
      where: { id: demandId },
      data: {
        status,
        isOverdue: status === 'OVERDUE' || (['REQUESTED', 'APPROVED', 'ORDERED'].includes(status) && existing.requiredDate < new Date()),
      },
    });

    await AuditService.log({
      userId,
      action: 'UPDATE_DEMAND_STATUS',
      module: 'MATERIAL_DEMAND',
      recordId: demandId,
      previousValue: { status: existing.status },
      newValue: { status },
    });

    return updated;
  }

  /**
   * Refreshes overdue status dynamically across all material demands
   * Rule: IF required_date < current_date AND status not in [Completed, Received] THEN mark overdue
   * Triggers overdue email if not previously notified within threshold
   */
  static async refreshOverdueStatus(): Promise<{ checked: number; updated: number; emailsSent: number }> {
    const now = new Date();
    const pendingDemands = await prisma.materialDemand.findMany({
      where: {
        status: { notIn: ['COMPLETED', 'RECEIVED', 'REJECTED'] },
      },
      include: {
        item: true,
        project: true,
      },
    });

    let updatedCount = 0;
    let emailsSentCount = 0;

    // Fetch configured CC addresses from SystemSettings
    const settingCc = await prisma.systemSetting.findUnique({
      where: { key: 'MATERIAL_OVERDUE_ALERT_CC' },
    });
    const configuredCc = settingCc?.value || 'procurement@builderops.com,admin@builderops.com';

    for (const demand of pendingDemands) {
      const isPastDue = new Date(demand.requiredDate) < now;

      if (isPastDue) {
        if (!demand.isOverdue || demand.status !== 'OVERDUE') {
          await prisma.materialDemand.update({
            where: { id: demand.id },
            data: {
              status: 'OVERDUE',
              isOverdue: true,
            },
          });
          updatedCount++;
        }

        // Check idempotency: Send email only if never sent, or last sent > 24 hours ago
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (!demand.lastEmailSentAt || demand.lastEmailSentAt < oneDayAgo) {
          // Lookup owner email dynamically from users table
          const ownerUser = await prisma.user.findFirst({
            where: { name: demand.ownerName },
            select: { email: true },
          });
          const recipientEmail = ownerUser?.email || 'engineer@builderops.com';

          const daysOverdue = Math.ceil((now.getTime() - new Date(demand.requiredDate).getTime()) / (1000 * 60 * 60 * 24));

          const emailSubject = `URGENT OVERDUE MATERIAL DEMAND: ${demand.demandNumber} - ${demand.item.name}`;
          const emailBody = `
ALERT: Material Demand is OVERDUE for Project: ${demand.project.name}

- Demand ID: ${demand.demandNumber}
- Material Item: ${demand.item.name} (${demand.item.itemCode})
- Quantity: ${demand.quantity} ${demand.item.unit}
- Required Date: ${demand.requiredDate.toISOString().split('T')[0]}
- Days Overdue: ${daysOverdue} Day(s)
- Priority: ${demand.priority}
- Responsible Site Owner: ${demand.ownerName}
- Assigned Procurement: ${demand.procurementPerson}

Please expedite purchase order execution or delivery schedule immediately.
          `.trim();

          const emailResult = await NotificationEmailService.sendEmail({
            to: recipientEmail,
            cc: configuredCc,
            subject: emailSubject,
            body: emailBody,
            demandId: demand.id,
          });

          if (emailResult.success) {
            await prisma.materialDemand.update({
              where: { id: demand.id },
              data: { lastEmailSentAt: now },
            });
            emailsSentCount++;
          }
        }
      }
    }

    return { checked: pendingDemands.length, updated: updatedCount, emailsSent: emailsSentCount };
  }
}
