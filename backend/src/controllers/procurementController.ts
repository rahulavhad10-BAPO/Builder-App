import { Request, Response } from 'express';
import { ProcurementService } from '../services/procurementService.js';
import { ComplianceService } from '../services/complianceService.js';
import { BOQService } from '../services/boqService.js';

export class ProcurementController {
  static async getVendors(_req: Request, res: Response): Promise<void> {
    try {
      const vendors = await ProcurementService.getVendors();
      res.json(vendors);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getPurchaseOrders(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, vendorId, status } = req.query;
      const pos = await ProcurementService.getPurchaseOrders({
        projectId: projectId as string,
        vendorId: vendorId as string,
        status: status as string,
      });
      res.json(pos);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createPurchaseOrder(req: Request, res: Response): Promise<void> {
    try {
      const { vendorId, projectId, demandId, deliveryDate, lineItems } = req.body;
      if (!vendorId || !projectId || !deliveryDate || !lineItems || lineItems.length === 0) {
        res.status(400).json({ error: 'vendorId, projectId, deliveryDate, and lineItems are required' });
        return;
      }

      const po = await ProcurementService.createPurchaseOrder({
        vendorId,
        projectId,
        demandId,
        deliveryDate: new Date(deliveryDate),
        lineItems,
      });

      res.status(201).json(po);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getPOExceptions(req: Request, res: Response): Promise<void> {
    try {
      const resolved = req.query.resolved !== undefined ? req.query.resolved === 'true' : undefined;
      const exceptions = await ProcurementService.getPOExceptions({ resolved });
      res.json(exceptions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async resolveException(req: Request, res: Response): Promise<void> {
    try {
      const resolved = await ProcurementService.resolveException(req.params.id as string, req.user?.id);
      res.json(resolved);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async verifyPO(req: Request, res: Response): Promise<void> {
    try {
      const result = await ProcurementService.verifyPurchaseOrder(req.params.id as string);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}

export class ComplianceController {
  static async getChecklist(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, category, status } = req.query;
      const list = await ComplianceService.getChecklist({
        projectId: projectId as string,
        category: category as string,
        status: status as string,
      });
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.query.projectId as string | undefined;
      const summary = await ComplianceService.getComplianceSummary(projectId);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const { status, remarks, evidence } = req.body;
      const updated = await ComplianceService.updateStatus(req.params.id as string, status, remarks, evidence, req.user?.id);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}

export class BOQController {
  static async getItems(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, buildingId, contractorId } = req.query;
      const items = await BOQService.getBOQItems({
        projectId: projectId as string,
        buildingId: buildingId as string,
        contractorId: contractorId as string,
      });
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async updateConsumption(req: Request, res: Response): Promise<void> {
    try {
      const { consumedQuantity } = req.body;
      if (consumedQuantity === undefined) {
        res.status(400).json({ error: 'consumedQuantity is required' });
        return;
      }
      const updated = await BOQService.updateConsumption(req.params.id as string, Number(consumedQuantity));
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
