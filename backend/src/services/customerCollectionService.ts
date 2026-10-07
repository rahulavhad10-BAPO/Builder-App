import prisma from '../db/prisma.js';
import { DemandEngine } from './demandEngine.js';

export class CustomerCollectionService {
  static async getCustomers(search?: string) {
    return prisma.customer.findMany({
      where: search ? {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { pan: { contains: search } },
        ],
      } : undefined,
      include: {
        flats: {
          include: {
            project: { select: { name: true, code: true } },
            building: { select: { name: true } },
          },
        },
        broker: true,
        _count: { select: { demands: true, payments: true, reminders: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getCustomerProfile(customerId: string) {
    await DemandEngine.refreshAllDemandStatuses();

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        broker: true,
        flats: {
          include: {
            project: true,
            building: true,
            payments: { where: { status: 'VERIFIED' } },
            demands: { orderBy: { dueDate: 'asc' } },
          },
        },
        demands: {
          orderBy: { dueDate: 'asc' },
          include: { flat: true },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: { flat: true },
        },
        reminders: {
          orderBy: { createdAt: 'desc' },
          include: { demand: true },
        },
      },
    });

    if (!customer) throw new Error('Customer not found');

    const totalAgreementValue = customer.flats.reduce((sum, f) => sum + f.agreementValue, 0);
    const totalPaid = customer.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = Math.max(0, totalAgreementValue - totalPaid);

    const now = new Date();
    const overdueDemands = customer.demands.filter(d => d.status === 'OVERDUE');
    const upcomingDemands = customer.demands.filter(d => d.balanceAmount > 0 && new Date(d.dueDate) >= now);

    return {
      customer,
      summary: {
        totalFlats: customer.flats.length,
        totalAgreementValue,
        totalPaid,
        totalOutstanding,
        overdueCount: overdueDemands.length,
        overdueAmount: overdueDemands.reduce((sum, d) => sum + d.balanceAmount, 0),
        upcomingCount: upcomingDemands.length,
        upcomingAmount: upcomingDemands.reduce((sum, d) => sum + d.balanceAmount, 0),
        collectionPercentage: totalAgreementValue > 0 ? Number(((totalPaid / totalAgreementValue) * 100).toFixed(1)) : 0,
      },
      flats: customer.flats,
      demands: customer.demands,
      payments: customer.payments,
      reminders: customer.reminders,
    };
  }

  static async getCollectionDashboard(projectId?: string) {
    await DemandEngine.refreshAllDemandStatuses();

    const where: any = {};
    if (projectId) where.projectId = projectId;

    const flats = await prisma.flat.findMany({
      where,
      include: {
        project: true,
        building: true,
        customer: true,
        payments: { where: { status: 'VERIFIED' } },
        demands: true,
      },
    });

    const bookedFlats = flats.filter(f => ['SOLD', 'AGREEMENT', 'BOOKED', 'POSSESSION', 'REGISTERED'].includes(f.status));

    const totalAgreementValue = bookedFlats.reduce((sum, f) => sum + f.agreementValue, 0);
    const totalCollected = bookedFlats.flatMap(f => f.payments).reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = Math.max(0, totalAgreementValue - totalCollected);

    const now = new Date();
    const allDemands = bookedFlats.flatMap(f => f.demands);
    const overdueDemands = allDemands.filter(d => d.status === 'OVERDUE');
    const overdueAmount = overdueDemands.reduce((sum, d) => sum + d.balanceAmount, 0);

    const upcomingDemands = allDemands.filter(d => d.balanceAmount > 0 && new Date(d.dueDate) >= now);
    const upcomingDemandAmount = upcomingDemands.reduce((sum, d) => sum + d.balanceAmount, 0);

    const collectionPercentage = totalAgreementValue > 0 ? Number(((totalCollected / totalAgreementValue) * 100).toFixed(1)) : 0;

    const customersWithOverdue = new Set(overdueDemands.map(d => d.customerId)).size;
    const flatsWithOverdue = new Set(overdueDemands.map(d => d.flatId)).size;

    // Chart: Collection by Tower
    const towerCollectionMap: Record<string, { tower: string; agreement: number; collected: number; outstanding: number }> = {};
    for (const f of bookedFlats) {
      const towerKey = f.building.name;
      if (!towerCollectionMap[towerKey]) {
        towerCollectionMap[towerKey] = { tower: towerKey, agreement: 0, collected: 0, outstanding: 0 };
      }
      const paid = f.payments.reduce((s, p) => s + p.amount, 0);
      towerCollectionMap[towerKey].agreement += f.agreementValue;
      towerCollectionMap[towerKey].collected += paid;
      towerCollectionMap[towerKey].outstanding += Math.max(0, f.agreementValue - paid);
    }

    // Chart: Collection by Project
    const projectCollectionMap: Record<string, { project: string; collected: number; overdue: number }> = {};
    for (const f of bookedFlats) {
      const prjKey = f.project.name;
      if (!projectCollectionMap[prjKey]) {
        projectCollectionMap[prjKey] = { project: prjKey, collected: 0, overdue: 0 };
      }
      projectCollectionMap[prjKey].collected += f.payments.reduce((s, p) => s + p.amount, 0);
      projectCollectionMap[prjKey].overdue += f.demands.filter(d => d.status === 'OVERDUE').reduce((s, d) => s + d.balanceAmount, 0);
    }

    // Chart: Upcoming Demands by Month (next 4 months)
    const upcomingByMonthMap: Record<string, number> = {};
    for (const d of upcomingDemands) {
      const monthKey = new Date(d.dueDate).toLocaleString('en-US', { month: 'short', year: 'numeric' });
      upcomingByMonthMap[monthKey] = (upcomingByMonthMap[monthKey] || 0) + d.balanceAmount;
    }

    return {
      kpis: {
        totalAgreementValue,
        totalCollected,
        totalOutstanding,
        overdueAmount,
        upcomingDemandAmount,
        collectionPercentage,
        customersWithOverdue,
        flatsWithOverdue,
      },
      charts: {
        collectionByTower: Object.values(towerCollectionMap),
        collectionByProject: Object.values(projectCollectionMap),
        upcomingDemandsByMonth: Object.entries(upcomingByMonthMap).map(([month, amount]) => ({ month, amount })),
      },
    };
  }
}
