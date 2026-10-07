import prisma from '../db/prisma.js';

export class BOQService {
  static async getBOQItems(filters?: { projectId?: string; buildingId?: string; contractorId?: string }) {
    const items = await prisma.boqItem.findMany({
      where: {
        projectId: filters?.projectId || undefined,
        buildingId: filters?.buildingId || undefined,
        contractorId: filters?.contractorId || undefined,
      },
      include: {
        contractor: true,
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: { itemCode: 'asc' },
    });

    return items.map((item) => {
      const remainingQty = Math.max(0, item.plannedQuantity - item.consumedQuantity);
      const consumedPercentage = item.plannedQuantity > 0 ? (item.consumedQuantity / item.plannedQuantity) * 100 : 0;
      const actualAmount = item.consumedQuantity * item.rate;
      const costVariance = actualAmount - item.amount;
      const quantityVariance = item.consumedQuantity - item.plannedQuantity;

      return {
        ...item,
        remainingQuantity: remainingQty,
        consumedPercentage: Number(consumedPercentage.toFixed(2)),
        actualAmount,
        costVariance,
        quantityVariance,
        isOverBudget: costVariance > 0,
      };
    });
  }

  static async updateConsumption(id: string, consumedQuantity: number) {
    const item = await prisma.boqItem.findUnique({ where: { id } });
    if (!item) throw new Error('BOQ item not found');

    const remaining = Math.max(0, item.plannedQuantity - consumedQuantity);
    const qtyVariance = consumedQuantity - item.plannedQuantity;
    const costVariance = qtyVariance * item.rate;

    return prisma.boqItem.update({
      where: { id },
      data: {
        consumedQuantity,
        remainingQuantity: remaining,
        quantityVariance: qtyVariance,
        costVariance,
      },
    });
  }
}
