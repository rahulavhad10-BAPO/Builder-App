import { Request, Response } from 'express';
import { CustomerCollectionService } from '../services/customerCollectionService.js';
import { OperationsService } from '../services/operationsService.js';
import { PaymentAllocationService } from '../services/paymentAllocationService.js';
import { DemandEngine } from '../services/demandEngine.js';
import { DemandReminderEngine } from '../services/demandReminderEngine.js';

export class CRMController {
  static async getCustomers(req: Request, res: Response): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const customers = await CustomerCollectionService.getCustomers(search);
      res.json(customers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getCustomerProfile(req: Request, res: Response): Promise<void> {
    try {
      const profile = await CustomerCollectionService.getCustomerProfile(req.params.id as string);
      res.json(profile);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }

  static async getCollectionDashboard(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.query.projectId as string | undefined;
      const data = await CustomerCollectionService.getCollectionDashboard(projectId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getBrokers(_req: Request, res: Response): Promise<void> {
    try {
      const brokers = await OperationsService.getBrokers();
      res.json(brokers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export class PaymentController {
  static async getPayments(req: Request, res: Response): Promise<void> {
    try {
      const { flatId, customerId, search } = req.query;
      const payments = await PaymentAllocationService.getPayments({
        flatId: flatId as string,
        customerId: customerId as string,
        search: search as string,
      });
      res.json(payments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async recordPayment(req: Request, res: Response): Promise<void> {
    try {
      const { flatId, customerId, amount, paymentMode, transactionRef, demandId, paymentDate, notes } = req.body;
      if (!flatId || !customerId || !amount || !paymentMode || !transactionRef) {
        res.status(400).json({ error: 'flatId, customerId, amount, paymentMode, and transactionRef are required' });
        return;
      }

      const result = await PaymentAllocationService.recordPayment({
        flatId,
        customerId,
        amount: Number(amount),
        paymentMode,
        transactionRef,
        demandId,
        paymentDate: paymentDate ? new Date(paymentDate) : undefined,
        notes,
        userId: req.user?.id,
      });

      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async createDemand(req: Request, res: Response): Promise<void> {
    try {
      const { flatId, customerId, projectId, demandType, demandDate, dueDate, demandAmount, taxAmount } = req.body;
      if (!flatId || !customerId || !projectId || !demandType || !demandDate || !dueDate || demandAmount === undefined) {
        res.status(400).json({ error: 'Missing required demand fields' });
        return;
      }

      const demand = await DemandEngine.createDemand({
        flatId,
        customerId,
        projectId,
        demandType,
        demandDate: new Date(demandDate),
        dueDate: new Date(dueDate),
        demandAmount: Number(demandAmount),
        taxAmount: taxAmount ? Number(taxAmount) : 0,
      });

      res.status(201).json(demand);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async sendReminder(req: Request, res: Response): Promise<void> {
    try {
      const { reminderType } = req.body;
      const result = await DemandReminderEngine.sendDemandReminder({
        demandId: req.params.id as string,
        reminderType: reminderType || 'CUSTOM',
        userId: req.user?.id,
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async runReminderScan(_req: Request, res: Response): Promise<void> {
    try {
      const result = await DemandReminderEngine.runReminderScan();
      res.json({ message: 'Demand reminder scan execution completed', ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getReminderHistory(req: Request, res: Response): Promise<void> {
    try {
      const { demandId, customerId } = req.query;
      const history = await DemandReminderEngine.getReminderHistory(
        demandId as string,
        customerId as string
      );
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
