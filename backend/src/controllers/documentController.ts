import { Request, Response } from 'express';
import { DocumentService } from '../services/documentService.js';
import path from 'path';
import fs from 'fs';

export class DocumentController {
  static async getDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, buildingId, category, search, status } = req.query;
      const docs = await DocumentService.getDocuments({
        projectId: projectId as string,
        buildingId: buildingId as string,
        category: category as string,
        search: search as string,
        status: status as string,
        userRole: req.user?.role,
      });
      res.json(docs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getDocumentById(req: Request, res: Response): Promise<void> {
    try {
      const doc = await DocumentService.getDocumentById(req.params.id as string);
      if (!doc) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      res.json(doc);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      const { projectId, buildingId, name, type, category, permissions, expiryDate, approvalStatus, textContent } = req.body;

      if (!name || !category) {
        res.status(400).json({ error: 'Document name and category are required' });
        return;
      }

      const storageReference = file ? file.filename : `simulated_${Date.now()}.pdf`;
      const fileType = file ? file.mimetype : 'application/pdf';
      const fileSize = file ? file.size : 102400;

      const doc = await DocumentService.uploadDocument({
        organizationId: req.user?.organizationId,
        projectId: projectId || undefined,
        buildingId: buildingId || undefined,
        name,
        type: type || 'PDF',
        category,
        fileType,
        storageReference,
        fileSize,
        uploadedBy: req.user?.name || 'Administrator',
        permissions: permissions || 'ALL',
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        approvalStatus: approvalStatus || 'APPROVED',
        textContent: textContent || undefined,
      });

      res.status(201).json(doc);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async uploadNewVersion(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      const { changeSummary } = req.body;
      const storageReference = file ? file.filename : `simulated_v2_${Date.now()}.pdf`;
      const fileSize = file ? file.size : 102400;

      const updated = await DocumentService.uploadNewVersion(req.params.id as string, {
        storageReference,
        fileSize,
        uploadedBy: req.user!.name,
        changeSummary,
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async deleteDocument(req: Request, res: Response): Promise<void> {
    try {
      const result = await DocumentService.deleteDocument(req.params.id as string, req.user?.id);
      res.json({ message: 'Document marked as deleted', document: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
