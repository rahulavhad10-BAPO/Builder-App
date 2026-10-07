import { Request, Response } from 'express';
import { MaterialInventoryService } from '../services/materialInventoryService.js';
import { MaterialDemandService } from '../services/materialDemandService.js';

export class InventoryController {
  static async getItems(req: Request, res: Response): Promise<void> {
    try {
      const { category, search, lowStockOnly } = req.query;
      const items = await MaterialInventoryService.getItems({
        category: category as string,
        search: search as string,
        lowStockOnly: lowStockOnly === 'true',
      });
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async recordTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { itemId, projectId, type, quantity, reference, notes } = req.body;
      if (!itemId || !projectId || !type || quantity === undefined) {
        res.status(400).json({ error: 'itemId, projectId, type, and quantity are required' });
        return;
      }

      const result = await MaterialInventoryService.recordTransaction({
        itemId,
        projectId,
        type,
        quantity: Number(quantity),
        reference,
        notes,
        createdBy: req.user!.name,
      });

      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}

export class DemandController {
  static async getDemands(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, status, priority, overdueOnly, search } = req.query;
      const demands = await MaterialDemandService.getDemands({
        projectId: projectId as string,
        status: status as string,
        priority: priority as string,
        overdueOnly: overdueOnly === 'true',
        search: search as string,
      });
      res.json(demands);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createDemand(req: Request, res: Response): Promise<void> {
    try {
      const { itemId, quantity, projectId, requiredDate, priority, procurementPerson } = req.body;
      if (!itemId || !quantity || !projectId || !requiredDate) {
        res.status(400).json({ error: 'itemId, quantity, projectId, and requiredDate are required' });
        return;
      }

      const demand = await MaterialDemandService.createDemand({
        itemId,
        quantity: Number(quantity),
        projectId,
        requesterName: req.user!.name,
        requiredDate: new Date(requiredDate),
        ownerName: req.user!.name,
        procurementPerson: procurementPerson || 'Amit Desai',
        priority,
      });

      res.status(201).json(demand);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ error: 'Status is required' });
        return;
      }

      const updated = await MaterialDemandService.updateStatus(req.params.id, status, req.user?.id);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async refreshOverdue(_req: Request, res: Response): Promise<void> {
    try {
      const result = await MaterialDemandService.refreshOverdueStatus();
      res.json({ message: 'Overdue material evaluation completed', ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
