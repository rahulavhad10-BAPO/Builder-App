import prisma from '../db/prisma.js';
import { AuditService } from './auditService.js';

export class MaterialInventoryService {
  static async getItems(filters?: { category?: string; search?: string; lowStockOnly?: boolean }) {
    const items = await prisma.inventoryItem.findMany({
      where: {
        category: filters?.category || undefined,
        OR: filters?.search ? [
          { name: { contains: filters.search } },
          { itemCode: { contains: filters.search } },
          { location: { contains: filters.search } },
        ] : undefined,
      },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    });

    // Dynamically calculate and annotate stock status
    const result = items.map((item) => {
      const isLowStock = item.currentStock <= item.reorderLevel;
      const isCritical = item.currentStock <= item.minStock;
      return {
        ...item,
        isLowStock,
        isCritical,
        stockStatus: isCritical ? 'CRITICAL' : isLowStock ? 'LOW' : 'OPTIMAL',
      };
    });

    if (filters?.lowStockOnly) {
      return result.filter((item) => item.isLowStock);
    }

    return result;
  }

  static async recordTransaction(data: {
    itemId: string;
    projectId: string;
    type: 'OPENING' | 'RECEIPT' | 'ISSUE' | 'ADJUSTMENT' | 'TRANSFER';
    quantity: number;
    reference?: string;
    notes?: string;
    createdBy: string;
  }) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: data.itemId },
    });

    if (!item) {
      throw new Error('Inventory item not found');
    }

    // Calculate updated stock
    let updatedStock = item.currentStock;
    if (data.type === 'RECEIPT' || data.type === 'OPENING') {
      updatedStock += data.quantity;
    } else if (data.type === 'ISSUE') {
      if (item.currentStock < data.quantity) {
        throw new Error(`Insufficient stock for issue. Available: ${item.currentStock}, Requested: ${data.quantity}`);
      }
      updatedStock -= data.quantity;
    } else if (data.type === 'ADJUSTMENT') {
      updatedStock += data.quantity; // quantity can be negative or positive
    } else if (data.type === 'TRANSFER') {
      updatedStock -= data.quantity;
    }

    const [tx, updatedItem] = await prisma.$transaction([
      prisma.inventoryTransaction.create({
        data: {
          itemId: data.itemId,
          projectId: data.projectId,
          type: data.type,
          quantity: data.quantity,
          reference: data.reference || null,
          notes: data.notes || null,
          createdBy: data.createdBy,
        },
      }),
      prisma.inventoryItem.update({
        where: { id: data.itemId },
        data: { currentStock: updatedStock },
      }),
    ]);

    await AuditService.log({
      action: `INVENTORY_${data.type}`,
      module: 'INVENTORY',
      recordId: item.id,
      previousValue: { stock: item.currentStock },
      newValue: { stock: updatedStock, transactionId: tx.id },
    });

    return { transaction: tx, item: updatedItem };
  }

  static async recalculateStockFromHistory(itemId: string) {
    const transactions = await prisma.inventoryTransaction.findMany({
      where: { itemId },
    });

    let calculatedStock = 0;
    for (const t of transactions) {
      if (t.type === 'RECEIPT' || t.type === 'OPENING') {
        calculatedStock += t.quantity;
      } else if (t.type === 'ISSUE' || t.type === 'TRANSFER') {
        calculatedStock -= t.quantity;
      } else if (t.type === 'ADJUSTMENT') {
        calculatedStock += t.quantity;
      }
    }

    return prisma.inventoryItem.update({
      where: { id: itemId },
      data: { currentStock: calculatedStock },
    });
  }

  static async updateThreshold(
    itemId: string,
    minStock?: number,
    reorderLevel?: number,
    updatedBy?: string
  ) {
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Inventory item not found');

    const updated = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        minStock: minStock !== undefined ? minStock : item.minStock,
        reorderLevel: reorderLevel !== undefined ? reorderLevel : item.reorderLevel,
      },
    });

    await AuditService.log({
      action: 'UPDATE_INVENTORY_THRESHOLDS',
      module: 'INVENTORY',
      recordId: itemId,
      previousValue: { minStock: item.minStock, reorderLevel: item.reorderLevel },
      newValue: { minStock: updated.minStock, reorderLevel: updated.reorderLevel, updatedBy },
    });

    return updated;
  }
}
