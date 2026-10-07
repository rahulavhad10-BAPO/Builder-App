import prisma from '../db/prisma.js';
import { AuditService } from './auditService.js';

export class ProcurementService {
  static async getVendors() {
    return prisma.vendor.findMany({
      include: {
        _count: { select: { purchaseOrders: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getPurchaseOrders(filters?: { projectId?: string; vendorId?: string; status?: string }) {
    return prisma.purchaseOrder.findMany({
      where: {
        projectId: filters?.projectId || undefined,
        vendorId: filters?.vendorId || undefined,
        status: filters?.status || undefined,
      },
      include: {
        vendor: true,
        project: { select: { id: true, name: true, code: true } },
        demand: { include: { item: true } },
        lineItems: { include: { item: true } },
        exceptions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getPOExceptions(filters?: { resolved?: boolean }) {
    return prisma.poException.findMany({
      where: {
        resolved: filters?.resolved !== undefined ? filters.resolved : undefined,
      },
      include: {
        po: {
          include: {
            vendor: true,
            project: { select: { id: true, name: true, code: true } },
            lineItems: { include: { item: true } },
          },
        },
        demand: {
          include: { item: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async resolveException(exceptionId: string, userId?: string) {
    const updated = await prisma.poException.update({
      where: { id: exceptionId },
      data: { resolved: true },
    });

    await AuditService.log({
      userId,
      action: 'RESOLVE_PO_EXCEPTION',
      module: 'PROCUREMENT',
      recordId: exceptionId,
    });

    return updated;
  }

  /**
   * PO Verification Engine:
   * Compares Approved Demand vs PO vs Line Items to detect:
   * - Quantity mismatch / Over-ordering / Under-ordering
   * - Duplicate PO
   * Stores exceptions in the PoException table
   */
  static async verifyPurchaseOrder(poId: string): Promise<{
    passed: boolean;
    exceptions: any[];
  }> {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        demand: { include: { item: true } },
        lineItems: { include: { item: true } },
      },
    });

    if (!po) throw new Error('Purchase Order not found');

    const detectedExceptions: Array<{ type: string; message: string }> = [];

    // Check duplicate POs for the same demand
    if (po.demandId) {
      const existingPOsForDemand = await prisma.purchaseOrder.findMany({
        where: {
          demandId: po.demandId,
          id: { not: po.id },
          status: { not: 'CANCELLED' },
        },
      });

      if (existingPOsForDemand.length > 0) {
        detectedExceptions.push({
          type: 'DUPLICATE_PO',
          message: `Duplicate PO detected: PO ${po.poNumber} references the same demand as ${existingPOsForDemand.map(p => p.poNumber).join(', ')}.`,
        });
      }
    }

    // Check demand quantity comparison
    if (po.demand && po.lineItems.length > 0) {
      const demandedQty = po.demand.quantity;
      const totalPoQty = po.lineItems.reduce((acc, li) => acc + li.quantity, 0);

      if (totalPoQty > demandedQty) {
        const excess = totalPoQty - demandedQty;
        detectedExceptions.push({
          type: 'OVER_ORDERING',
          message: `PO quantity (${totalPoQty.toLocaleString()} ${po.demand.item.unit}) exceeds approved demand (${demandedQty.toLocaleString()} ${po.demand.item.unit}) by ${excess.toLocaleString()} ${po.demand.item.unit}. Quantity mismatch detected.`,
        });
      } else if (totalPoQty < demandedQty) {
        const deficit = demandedQty - totalPoQty;
        detectedExceptions.push({
          type: 'UNDER_ORDERING',
          message: `PO quantity (${totalPoQty.toLocaleString()} ${po.demand.item.unit}) is less than approved demand (${demandedQty.toLocaleString()} ${po.demand.item.unit}) by ${deficit.toLocaleString()} ${po.demand.item.unit}.`,
        });
      }

      // Check item mismatch
      const itemMismatch = po.lineItems.some(li => li.itemId !== po.demand?.itemId);
      if (itemMismatch) {
        detectedExceptions.push({
          type: 'ITEM_MISMATCH',
          message: `PO contains line items that do not match the requested material item ${po.demand.item.name}.`,
        });
      }
    }

    // Persist any new exceptions
    for (const ex of detectedExceptions) {
      const alreadyLogged = await prisma.poException.findFirst({
        where: {
          poId: po.id,
          type: ex.type,
          resolved: false,
        },
      });

      if (!alreadyLogged) {
        await prisma.poException.create({
          data: {
            poId: po.id,
            demandId: po.demandId || null,
            type: ex.type,
            message: ex.message,
            resolved: false,
          },
        });

        await AuditService.log({
          action: 'PO_EXCEPTION_DETECTED',
          module: 'PROCUREMENT',
          recordId: po.id,
          newValue: ex,
        });
      }
    }

    const currentExceptions = await prisma.poException.findMany({
      where: { poId: po.id },
    });

    return {
      passed: detectedExceptions.length === 0,
      exceptions: currentExceptions,
    };
  }

  static async createPurchaseOrder(data: {
    vendorId: string;
    projectId: string;
    demandId?: string;
    deliveryDate: Date;
    lineItems: Array<{ itemId: string; quantity: number; unitPrice: number }>;
  }) {
    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const totalAmount = data.lineItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        vendorId: data.vendorId,
        projectId: data.projectId,
        demandId: data.demandId || null,
        deliveryDate: new Date(data.deliveryDate),
        totalAmount,
        status: 'ISSUED',
        lineItems: {
          create: data.lineItems.map(item => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { lineItems: true },
    });

    if (data.demandId) {
      await prisma.materialDemand.update({
        where: { id: data.demandId },
        data: { status: 'ORDERED' },
      });
    }

    // Run PO verification engine immediately upon creation!
    await this.verifyPurchaseOrder(po.id);

    return po;
  }
}
