import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboardService.js';

export class DashboardController {
  static async getCommandCenter(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.query.projectId as string | undefined;
      const data = await DashboardService.getCommandCenterData(projectId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch command center metrics' });
    }
  }
}
