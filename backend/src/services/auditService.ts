import prisma from '../db/prisma.js';

export class AuditService {
  static async log(data: {
    userId?: string;
    action: string;
    module: string;
    recordId: string;
    previousValue?: any;
    newValue?: any;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          action: data.action,
          module: data.module,
          recordId: data.recordId,
          previousValue: data.previousValue ? JSON.stringify(data.previousValue) : null,
          newValue: data.newValue ? JSON.stringify(data.newValue) : null,
        },
      });
    } catch (err) {
      console.error('Failed to create audit log:', err);
    }
  }

  static async getLogs(filters?: { module?: string; recordId?: string; limit?: number }) {
    return prisma.auditLog.findMany({
      where: {
        module: filters?.module || undefined,
        recordId: filters?.recordId || undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: filters?.limit || 100,
    });
  }
}
