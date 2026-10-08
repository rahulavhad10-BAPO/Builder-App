import { Request, Response } from 'express';
import { ContractorService } from '../services/contractorService.js';
import { OperationsService } from '../services/operationsService.js';
import { AskProjectService } from '../services/rag/askProjectService.js';
import { RAGIngestionService } from '../services/rag/ragIngestionService.js';
import { AuditService } from '../services/auditService.js';
import { NotificationEmailService } from '../services/notificationEmailService.js';
import prisma from '../db/prisma.js';

export class ContractorController {
  static async getContractors(_req: Request, res: Response): Promise<void> {
    try {
      const contractors = await ContractorService.getContractors();
      res.json(contractors);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getContractorById(req: Request, res: Response): Promise<void> {
    try {
      const contractor = await ContractorService.getContractorById(req.params.id as string);
      if (!contractor) {
        res.status(404).json({ error: 'Contractor not found' });
        return;
      }
      res.json(contractor);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export class OperationsController {
  static async getDrawings(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, category, status } = req.query;
      const drawings = await OperationsService.getDrawings({
        projectId: projectId as string,
        category: category as string,
        status: status as string,
      });
      res.json(drawings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createDrawing(req: Request, res: Response): Promise<void> {
    try {
      const drawing = await OperationsService.createDrawing({
        ...req.body,
        uploadedBy: req.user!.name,
      });
      res.status(201).json(drawing);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getDailyReports(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, contractorId } = req.query;
      const reports = await OperationsService.getDailyReports({
        projectId: projectId as string,
        contractorId: contractorId as string,
      });
      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createDailyReport(req: Request, res: Response): Promise<void> {
    try {
      const report = await OperationsService.createDailyReport({
        ...req.body,
        submittedBy: req.user!.name,
      });
      res.status(201).json(report);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getMonthlyReports(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.query.projectId as string | undefined;
      const reports = await OperationsService.getMonthlyReports(projectId);
      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getIssues(req: Request, res: Response): Promise<void> {
    try {
      const { type, priority, status, projectId } = req.query;
      const issues = await OperationsService.getIssuesSnagsRFIs({
        type: type as string,
        priority: priority as string,
        status: status as string,
        projectId: projectId as string,
      });
      res.json(issues);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async updateIssueStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status, resolution } = req.body;
      const updated = await OperationsService.updateIssueStatus(req.params.id as string, status, resolution);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getMeetings(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.query.projectId as string | undefined;
      const meetings = await OperationsService.getMeetings(projectId);
      res.json(meetings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export class AskProjectController {
  static async query(req: Request, res: Response): Promise<void> {
    try {
      const { query, projectId } = req.body;
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Query string is required' });
        return;
      }

      const result = await AskProjectService.handleQuery(query, projectId, req.user?.role);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export class RAGController {
  static async getStatus(_req: Request, res: Response): Promise<void> {
    try {
      const isEnabled = process.env.RAG_ENABLED === 'true';
      const chunkCount = await prisma.documentChunk.count();
      const indexedDocs = await prisma.document.count({ where: { ragStatus: 'INDEXED' } });
      const indexedDrawings = await prisma.drawing.count({ where: { ragStatus: 'INDEXED' } });
      res.json({
        enabled: isEnabled,
        provider: RAGIngestionService.getProvider().name,
        vectorDimensions: 384,
        totalChunks: chunkCount,
        indexedDocuments: indexedDocs,
        indexedDrawings: indexedDrawings,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async reindexAll(_req: Request, res: Response): Promise<void> {
    try {
      const result = await RAGIngestionService.reindexAll();
      res.json({ message: 'Vector reindexing completed successfully', ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async ingestDocument(req: Request, res: Response): Promise<void> {
    try {
      const result = await RAGIngestionService.ingestDocument(req.params.id as string);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export class AdminController {
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { module, recordId, limit } = req.query;
      const logs = await AuditService.getLogs({
        module: module as string,
        recordId: recordId as string,
        limit: limit ? Number(limit) : 100,
      });
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getEmailLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const logs = await NotificationEmailService.getEmailLogs(limit);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getSettings(_req: Request, res: Response): Promise<void> {
    try {
      const settings = await prisma.systemSetting.findMany();
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async updateSetting(req: Request, res: Response): Promise<void> {
    try {
      const { key, value } = req.body;
      const updated = await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getSystemStatus(_req: Request, res: Response): Promise<void> {
    try {
      const [userCount, projectCount, flatCount, docCount, demandCount] = await Promise.all([
        prisma.user.count(),
        prisma.project.count(),
        prisma.flat.count(),
        prisma.document.count(),
        prisma.paymentDemand.count(),
      ]);

      res.json({
        systemStatus: 'OPERATIONAL',
        environment: process.env.NODE_ENV || 'development',
        ragEnabled: process.env.RAG_ENABLED === 'true',
        version: '1.0.0-PROD',
        entities: {
          users: userCount,
          projects: projectCount,
          flats: flatCount,
          documents: docCount,
          paymentDemands: demandCount,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
