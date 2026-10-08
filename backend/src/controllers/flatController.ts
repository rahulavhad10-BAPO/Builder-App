import { Request, Response } from 'express';
import { FlatInventoryService } from '../services/flatInventoryService.js';
import { Flat360Service } from '../services/flat360Service.js';

export class FlatController {
  static async getFlats(req: Request, res: Response): Promise<void> {
    try {
      const {
        projectId,
        buildingId,
        floorNumber,
        configuration,
        status,
        customerId,
        brokerId,
        salesExecutiveName,
        paymentStatus,
        search,
      } = req.query;

      const flats = await FlatInventoryService.getFlats({
        projectId: projectId as string,
        buildingId: buildingId as string,
        floorNumber: floorNumber ? Number(floorNumber) : undefined,
        configuration: configuration as string,
        status: status as string,
        customerId: customerId as string,
        brokerId: brokerId as string,
        salesExecutiveName: salesExecutiveName as string,
        paymentStatus: paymentStatus as any,
        search: search as string,
      });

      res.json(flats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getDashboardKPIs(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.query.projectId as string | undefined;
      const kpis = await FlatInventoryService.getDashboardKPIs(projectId);
      res.json(kpis);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getFlat360(req: Request, res: Response): Promise<void> {
    try {
      const data = await Flat360Service.getFlat360Data(req.params.id as string);
      res.json(data);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status, customerId, bookingDate, agreementDate, notes } = req.body;
      if (!status) {
        res.status(400).json({ error: 'Status is required' });
        return;
      }

      const updated = await FlatInventoryService.updateFlatStatus(req.params.id as string, status, {
        customerId: customerId || undefined,
        bookingDate: bookingDate ? new Date(bookingDate) : undefined,
        agreementDate: agreementDate ? new Date(agreementDate) : undefined,
        notes: notes !== undefined ? notes : undefined,
      });

      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
