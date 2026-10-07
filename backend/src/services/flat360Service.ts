import prisma from '../db/prisma.js';
import { DemandEngine } from './demandEngine.js';

export class Flat360Service {
  static async getFlat360Data(flatId: string) {
    await DemandEngine.refreshAllDemandStatuses();

    const flat = await prisma.flat.findUnique({
      where: { id: flatId },
      include: {
        project: true,
        building: true,
        customer: true,
        broker: true,
        demands: {
          orderBy: { dueDate: 'asc' },
          include: {
            allocations: {
              include: { payment: true },
            },
            reminders: {
              orderBy: { scheduledDate: 'desc' },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            allocations: {
              include: { demand: true },
            },
          },
        },
      },
    });

    if (!flat) throw new Error('Flat not found');

    const now = new Date();
    const validPayments = flat.payments.filter(p => p.status === 'VERIFIED');
    const totalPaid = validPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = Math.max(0, flat.agreementValue - totalPaid);
    const collectionPercentage = flat.agreementValue > 0 ? Number(((totalPaid / flat.agreementValue) * 100).toFixed(1)) : 0;

    // Overdue Demands
    const overdueDemands = flat.demands.filter(d => d.status === 'OVERDUE');
    const overdueAmount = overdueDemands.reduce((sum, d) => sum + d.balanceAmount, 0);

    // Upcoming Demands
    const upcomingDemands = flat.demands.filter(d => d.balanceAmount > 0 && new Date(d.dueDate) >= now);
    const nextDemand = upcomingDemands.length > 0 ? upcomingDemands[0] : null;

    // Last Payment
    const lastPayment = validPayments.length > 0 ? validPayments[0] : null;

    // Demands that have already been issued
    const demandHistory = flat.demands.filter(d => new Date(d.demandDate) <= now);
    const totalDemandedAmount = demandHistory.reduce((sum, d) => sum + d.totalAmount, 0);

    // Reminders flattened
    const reminderHistory = flat.demands.flatMap(d => d.reminders).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Relevant Documents
    const documents = await prisma.document.findMany({
      where: {
        projectId: flat.projectId,
        status: 'ACTIVE',
      },
      take: 10,
    });

    return {
      overview: {
        id: flat.id,
        unitNumber: flat.unitNumber,
        project: flat.project.name,
        building: flat.building.name,
        floorNumber: flat.floorNumber,
        configuration: flat.configuration,
        carpetArea: flat.carpetArea,
        saleableArea: flat.saleableArea,
        parking: flat.parking,
        basePrice: flat.basePrice,
        otherCharges: flat.otherCharges,
        agreementValue: flat.agreementValue,
        totalConsideration: flat.totalConsideration,
        status: flat.status,
        customer: flat.customer,
        salesExecutiveName: flat.salesExecutiveName,
        broker: flat.broker,
        bookingDate: flat.bookingDate,
        agreementDate: flat.agreementDate,
        possessionDate: flat.possessionDate,
        registrationDate: flat.registrationDate,
        notes: flat.notes,
      },
      paymentSummary: {
        agreementValue: flat.agreementValue,
        totalAmountDue: totalDemandedAmount,
        totalPaid,
        outstanding,
        overdueAmount,
        upcomingDemandCount: upcomingDemands.length,
        nextDemandDate: nextDemand?.dueDate || null,
        nextDemandAmount: nextDemand?.balanceAmount || 0,
        lastPaymentDate: lastPayment?.paymentDate || null,
        lastPaymentAmount: lastPayment?.amount || 0,
        collectionPercentage,
      },
      paymentHistory: flat.payments,
      demandHistory: flat.demands,
      upcomingDemands,
      reminderHistory,
      documents,
      notesActivity: [
        {
          timestamp: flat.updatedAt,
          author: flat.salesExecutiveName || 'System',
          note: `Commercial state currently at ${flat.status}. Last payment recorded: ₹${lastPayment ? lastPayment.amount.toLocaleString('en-IN') : 0}.`,
        },
      ],
    };
  }
}
