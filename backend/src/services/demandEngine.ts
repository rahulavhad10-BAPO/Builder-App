import prisma from '../db/prisma.js';
import { AuditService } from './auditService.js';

export class DemandEngine {
  /**
   * Evaluates dynamic status for a payment demand:
   * - If balanceAmount <= 0 -> PAID
   * - If paidAmount > 0 AND balanceAmount > 0 -> PARTIALLY_PAID (or OVERDUE if dueDate < now)
   * - If dueDate < currentDate AND balanceAmount > 0 -> OVERDUE
   * - If dueDate >= currentDate AND balanceAmount > 0 -> UPCOMING (or DUE if within 7 days)
   */
  static evaluateDemandStatus(demand: {
    dueDate: Date;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
  }): { status: string; daysOverdue: number } {
    const now = new Date();
    const dueTime = new Date(demand.dueDate).getTime();
    const nowTime = now.getTime();
    const isPastDue = dueTime < nowTime;
    const daysOverdue = isPastDue ? Math.ceil((nowTime - dueTime) / (1000 * 60 * 60 * 24)) : 0;

    if (demand.balanceAmount <= 0) {
      return { status: 'PAID', daysOverdue: 0 };
    }

    if (isPastDue) {
      return { status: 'OVERDUE', daysOverdue };
    }

    if (demand.paidAmount > 0) {
      return { status: 'PARTIALLY_PAID', daysOverdue: 0 };
    }

    // Due within 7 days
    const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
      return { status: 'DUE', daysOverdue: 0 };
    }

    return { status: 'UPCOMING', daysOverdue: 0 };
  }

  /**
   * Refreshes dynamic status across all payment demands in database
   */
  static async refreshAllDemandStatuses() {
    const demands = await prisma.paymentDemand.findMany({
      where: {
        status: { notIn: ['CANCELLED'] },
      },
    });

    for (const d of demands) {
      const { status, daysOverdue } = this.evaluateDemandStatus({
        dueDate: d.dueDate,
        totalAmount: d.totalAmount,
        paidAmount: d.paidAmount,
        balanceAmount: d.balanceAmount,
      });

      if (d.status !== status || d.daysOverdue !== daysOverdue) {
        await prisma.paymentDemand.update({
          where: { id: d.id },
          data: { status, daysOverdue },
        });
      }
    }
  }

  static async createDemand(data: {
    flatId: string;
    customerId: string;
    projectId: string;
    demandType: string;
    demandDate: Date;
    dueDate: Date;
    demandAmount: number;
    taxAmount?: number;
  }) {
    const count = await prisma.paymentDemand.count();
    const demandNumber = `DEM-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const tax = data.taxAmount || 0;
    const totalAmount = data.demandAmount + tax;

    const { status, daysOverdue } = this.evaluateDemandStatus({
      dueDate: new Date(data.dueDate),
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
    });

    const demand = await prisma.paymentDemand.create({
      data: {
        demandNumber,
        flatId: data.flatId,
        customerId: data.customerId,
        projectId: data.projectId,
        demandType: data.demandType,
        demandDate: new Date(data.demandDate),
        dueDate: new Date(data.dueDate),
        demandAmount: data.demandAmount,
        taxAmount: tax,
        totalAmount,
        paidAmount: 0,
        balanceAmount: totalAmount,
        status,
        daysOverdue,
      },
      include: { flat: true, customer: true },
    });

    await AuditService.log({
      action: 'CREATE_PAYMENT_DEMAND',
      module: 'DEMAND',
      recordId: demand.id,
      newValue: { demandNumber, totalAmount, status },
    });

    return demand;
  }
}
