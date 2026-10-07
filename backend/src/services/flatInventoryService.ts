import prisma from '../db/prisma.js';
import { DemandEngine } from './demandEngine.js';

export class FlatInventoryService {
  /**
   * Calculates comprehensive Flat Master metrics and returns enriched flat records
   */
  static async getFlats(filters?: {
    projectId?: string;
    buildingId?: string;
    floorNumber?: number;
    configuration?: string;
    status?: string;
    customerId?: string;
    brokerId?: string;
    salesExecutiveName?: string;
    paymentStatus?: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'NO_PAYMENT';
    search?: string;
  }) {
    // Refresh demands status first
    await DemandEngine.refreshAllDemandStatuses();

    const where: any = {};
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.buildingId) where.buildingId = filters.buildingId;
    if (filters?.floorNumber) where.floorNumber = Number(filters.floorNumber);
    if (filters?.configuration) where.configuration = filters.configuration;
    if (filters?.status) where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.brokerId) where.brokerId = filters.brokerId;
    if (filters?.salesExecutiveName) where.salesExecutiveName = filters.salesExecutiveName;

    if (filters?.search) {
      where.OR = [
        { unitNumber: { contains: filters.search } },
        { customer: { name: { contains: filters.search } } },
        { broker: { name: { contains: filters.search } } },
      ];
    }

    const flats = await prisma.flat.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true, code: true } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
        broker: { select: { id: true, name: true, company: true } },
        demands: {
          orderBy: { dueDate: 'asc' },
          include: {
            allocations: true,
            reminders: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
      orderBy: [{ floorNumber: 'asc' }, { unitNumber: 'asc' }],
    });

    const now = new Date();

    const enriched = flats.map((flat) => {
      const validPayments = flat.payments.filter(p => p.status === 'VERIFIED');
      const amountPaid = validPayments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = Math.max(0, flat.agreementValue - amountPaid);
      const collectionPercentage = flat.agreementValue > 0 ? Number(((amountPaid / flat.agreementValue) * 100).toFixed(1)) : 0;

      // Overdue demands
      const overdueDemands = flat.demands.filter(d => d.status === 'OVERDUE');
      const overdueAmount = overdueDemands.reduce((sum, d) => sum + d.balanceAmount, 0);

      // Last demand
      const pastDemands = flat.demands.filter(d => new Date(d.demandDate) <= now);
      const lastDemand = pastDemands.length > 0 ? pastDemands[pastDemands.length - 1] : null;

      // Upcoming demands
      const futureDemands = flat.demands.filter(d => d.balanceAmount > 0 && new Date(d.dueDate) >= now);
      const nextDemand = futureDemands.length > 0 ? futureDemands[0] : null;
      const next3Demands = futureDemands.slice(0, 3);
      const totalFutureDemandValue = futureDemands.reduce((sum, d) => sum + d.balanceAmount, 0);

      // Last payment
      const lastPayment = validPayments.length > 0 ? validPayments[0] : null;

      // Payment Status classification
      let computedPaymentStatus = 'NO_PAYMENT';
      if (amountPaid >= flat.agreementValue && flat.agreementValue > 0) {
        computedPaymentStatus = 'PAID';
      } else if (overdueAmount > 0) {
        computedPaymentStatus = 'OVERDUE';
      } else if (amountPaid > 0) {
        computedPaymentStatus = 'PARTIAL';
      }

      return {
        ...flat,
        amountPaid,
        outstanding,
        collectionPercentage,
        overdueAmount,
        lastDemand: lastDemand ? {
          id: lastDemand.id,
          demandNumber: lastDemand.demandNumber,
          demandType: lastDemand.demandType,
          totalAmount: lastDemand.totalAmount,
          paidAmount: lastDemand.paidAmount,
          balanceAmount: lastDemand.balanceAmount,
          dueDate: lastDemand.dueDate,
          status: lastDemand.status,
          daysOverdue: lastDemand.daysOverdue,
          lastReminder: lastDemand.reminders[0] || null,
        } : null,
        nextDemand: nextDemand ? {
          id: nextDemand.id,
          demandNumber: nextDemand.demandNumber,
          demandType: nextDemand.demandType,
          totalAmount: nextDemand.totalAmount,
          balanceAmount: nextDemand.balanceAmount,
          dueDate: nextDemand.dueDate,
        } : null,
        next3Demands,
        totalFutureDemandValue,
        lastPayment: lastPayment ? {
          receiptNumber: lastPayment.receiptNumber,
          amount: lastPayment.amount,
          paymentDate: lastPayment.paymentDate,
          paymentMode: lastPayment.paymentMode,
        } : null,
        computedPaymentStatus,
      };
    });

    if (filters?.paymentStatus) {
      return enriched.filter(f => f.computedPaymentStatus === filters.paymentStatus);
    }

    return enriched;
  }

  /**
   * Flat Inventory Dashboard KPIs
   */
  static async getDashboardKPIs(projectId?: string) {
    const flats = await this.getFlats(projectId ? { projectId } : undefined);

    const totalFlats = flats.length;
    const available = flats.filter(f => f.status === 'AVAILABLE').length;
    const blocked = flats.filter(f => f.status === 'BLOCKED').length;
    const booked = flats.filter(f => f.status === 'BOOKED').length;
    const sold = flats.filter(f => ['SOLD', 'AGREEMENT', 'POSSESSION', 'REGISTERED'].includes(f.status)).length;
    const cancelled = flats.filter(f => f.status === 'CANCELLED').length;

    const totalInventoryValue = flats.reduce((acc, f) => acc + f.totalConsideration, 0);
    const soldFlats = flats.filter(f => ['SOLD', 'AGREEMENT', 'POSSESSION', 'REGISTERED'].includes(f.status));
    const soldValue = soldFlats.reduce((acc, f) => acc + f.agreementValue, 0);
    const unsoldValue = flats.filter(f => ['AVAILABLE', 'BLOCKED'].includes(f.status)).reduce((acc, f) => acc + f.totalConsideration, 0);

    const totalCollection = soldFlats.reduce((acc, f) => acc + f.amountPaid, 0);
    const totalOutstanding = soldFlats.reduce((acc, f) => acc + f.outstanding, 0);
    const overdueAmount = soldFlats.reduce((acc, f) => acc + f.overdueAmount, 0);
    const upcomingDemandAmount = soldFlats.reduce((acc, f) => acc + f.totalFutureDemandValue, 0);

    const collectionEfficiency = soldValue > 0 ? Number(((totalCollection / soldValue) * 100).toFixed(1)) : 0;
    const flatsWithOverdue = soldFlats.filter(f => f.overdueAmount > 0).length;
    const upcomingDemandsCount = soldFlats.filter(f => f.nextDemand !== null).length;
    const flatsNoPayment = soldFlats.filter(f => f.amountPaid === 0).length;

    return {
      totalFlats,
      available,
      blocked,
      booked,
      sold,
      cancelled,
      totalInventoryValue,
      soldValue,
      unsoldValue,
      totalCollection,
      totalOutstanding,
      overdueAmount,
      upcomingDemandAmount,
      collectionEfficiency,
      flatsWithOverdue,
      upcomingDemandsCount,
      flatsNoPayment,
    };
  }

  static async updateFlatStatus(flatId: string, status: string, additionalData?: any) {
    return prisma.flat.update({
      where: { id: flatId },
      data: {
        status,
        ...additionalData,
      },
    });
  }
}
