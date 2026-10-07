import prisma from '../db/prisma.js';
import { AuditService } from './auditService.js';
import { DemandEngine } from './demandEngine.js';

export class PaymentAllocationService {
  /**
   * Records a payment and allocates it towards one or more payment demands
   * Supports: Full payment, Partial payment, Multi-demand waterfall allocation
   */
  static async recordPayment(data: {
    flatId: string;
    customerId: string;
    amount: number;
    paymentMode: string;
    transactionRef: string;
    demandId?: string; // Optional: specific demand target
    paymentDate?: Date;
    notes?: string;
    userId?: string;
  }) {
    if (data.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const flat = await prisma.flat.findUnique({
      where: { id: data.flatId },
      include: {
        demands: {
          where: { status: { notIn: ['PAID', 'CANCELLED'] } },
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!flat) throw new Error('Flat not found');

    const count = await prisma.payment.count();
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Create payment in a database transaction
    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          receiptNumber,
          flatId: data.flatId,
          customerId: data.customerId,
          amount: data.amount,
          paymentMode: data.paymentMode,
          transactionRef: data.transactionRef,
          status: 'VERIFIED',
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          notes: data.notes || null,
        },
      });

      let remainingToAllocate = data.amount;

      // Determine target demands: either specified demand or waterfall against oldest unpaid demands
      let targetDemands = flat.demands;
      if (data.demandId) {
        targetDemands = flat.demands.filter(d => d.id === data.demandId);
      }

      for (const demand of targetDemands) {
        if (remainingToAllocate <= 0) break;

        const currentBalance = demand.balanceAmount;
        const allocAmount = Math.min(remainingToAllocate, currentBalance);

        if (allocAmount > 0) {
          // Create allocation record
          await tx.paymentAllocation.create({
            data: {
              paymentId: p.id,
              demandId: demand.id,
              amount: allocAmount,
            },
          });

          const newPaidAmount = demand.paidAmount + allocAmount;
          const newBalance = Math.max(0, demand.totalAmount - newPaidAmount);

          const { status, daysOverdue } = DemandEngine.evaluateDemandStatus({
            dueDate: demand.dueDate,
            totalAmount: demand.totalAmount,
            paidAmount: newPaidAmount,
            balanceAmount: newBalance,
          });

          await tx.paymentDemand.update({
            where: { id: demand.id },
            data: {
              paidAmount: newPaidAmount,
              balanceAmount: newBalance,
              status,
              daysOverdue,
              paymentDate: newBalance === 0 ? p.paymentDate : demand.paymentDate,
            },
          });

          remainingToAllocate -= allocAmount;
        }
      }

      return p;
    }, { timeout: 20000, maxWait: 10000 });

    await AuditService.log({
      userId: data.userId,
      action: 'RECORD_PAYMENT',
      module: 'PAYMENT',
      recordId: payment.id,
      newValue: {
        receiptNumber: payment.receiptNumber,
        amount: payment.amount,
        flatId: payment.flatId,
        mode: payment.paymentMode,
      },
    });

    return payment;
  }

  static async getPayments(filters?: { flatId?: string; customerId?: string; search?: string }) {
    return prisma.payment.findMany({
      where: {
        flatId: filters?.flatId || undefined,
        customerId: filters?.customerId || undefined,
        OR: filters?.search ? [
          { receiptNumber: { contains: filters.search } },
          { transactionRef: { contains: filters.search } },
        ] : undefined,
      },
      include: {
        flat: { select: { id: true, unitNumber: true } },
        customer: { select: { id: true, name: true, phone: true } },
        allocations: {
          include: {
            demand: {
              select: {
                id: true,
                demandNumber: true,
                demandType: true,
                totalAmount: true,
                balanceAmount: true,
              },
            },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }
}
