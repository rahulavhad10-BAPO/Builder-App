import prisma from '../db/prisma.js';
import { AuditService } from './auditService.js';
import { RAGIngestionService } from './rag/ragIngestionService.js';
import fs from 'fs';
import path from 'path';

export class DocumentService {
  static async uploadDocument(data: {
    organizationId: string;
    projectId: string;
    buildingId?: string;
    name: string;
    type: string;
    category: string;
    fileType: string;
    storageReference: string;
    fileSize: number;
    uploadedBy: string;
    expiryDate?: Date;
    permissions?: string;
    approvalStatus?: string;
    textContent?: string;
  }) {
    const doc = await prisma.document.create({
      data: {
        organizationId: data.organizationId,
        projectId: data.projectId,
        buildingId: data.buildingId || null,
        name: data.name,
        type: data.type,
        category: data.category,
        fileType: data.fileType,
        storageReference: data.storageReference,
        fileSize: data.fileSize,
        uploadedBy: data.uploadedBy,
        expiryDate: data.expiryDate || null,
        permissions: data.permissions || 'ALL',
        approvalStatus: data.approvalStatus || 'APPROVED',
        textContent: data.textContent || null,
        version: 1,
        status: 'ACTIVE',
        ragEnabled: process.env.RAG_ENABLED === 'true',
        ragStatus: 'NOT_INDEXED',
      },
    });

    // Save initial version record
    await prisma.documentVersion.create({
      data: {
        documentId: doc.id,
        versionNumber: 1,
        storageReference: data.storageReference,
        uploadedBy: data.uploadedBy,
        changeSummary: 'Initial document upload',
      },
    });

    // Auto-ingest into Vector RAG Store if enabled
    if (process.env.RAG_ENABLED === 'true') {
      try {
        await RAGIngestionService.ingestDocument(doc.id);
      } catch (err) {
        console.warn('Auto RAG ingestion on upload deferred:', err);
      }
    }

    await AuditService.log({
      action: 'UPLOAD_DOCUMENT',
      module: 'DOCUMENT',
      recordId: doc.id,
      newValue: { name: doc.name, version: 1, category: doc.category },
    });

    const finalDoc = await prisma.document.findUnique({ where: { id: doc.id } });
    return finalDoc || doc;
  }

  static async uploadNewVersion(documentId: string, data: {
    storageReference: string;
    fileSize: number;
    uploadedBy: string;
    changeSummary?: string;
  }) {
    const existing = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!existing) {
      throw new Error('Document not found');
    }

    const newVersion = existing.version + 1;

    // Record old version in DocumentVersion history
    await prisma.documentVersion.create({
      data: {
        documentId: existing.id,
        versionNumber: newVersion,
        storageReference: data.storageReference,
        uploadedBy: data.uploadedBy,
        changeSummary: data.changeSummary || `Updated to version ${newVersion}`,
      },
    });

    // Update main document to point to new version
    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        version: newVersion,
        storageReference: data.storageReference,
        fileSize: data.fileSize,
        uploadedBy: data.uploadedBy,
        uploadedAt: new Date(),
        ragStatus: 'NOT_INDEXED', // Set to NOT_INDEXED on new version so RAG can reindex
        contentVersion: newVersion,
      },
    });

    if (process.env.RAG_ENABLED === 'true') {
      try {
        await RAGIngestionService.ingestDocument(documentId);
      } catch (err) {
        console.warn('Auto RAG reindex on version update deferred:', err);
      }
    }

    await AuditService.log({
      action: 'NEW_VERSION_DOCUMENT',
      module: 'DOCUMENT',
      recordId: documentId,
      previousValue: { version: existing.version },
      newValue: { version: newVersion, changeSummary: data.changeSummary },
    });

    const finalUpdated = await prisma.document.findUnique({ where: { id: documentId } });
    return finalUpdated || updated;
  }

  static async getDocuments(filters?: {
    projectId?: string;
    buildingId?: string;
    category?: string;
    status?: string;
    search?: string;
    userRole?: string;
  }) {
    const where: any = {
      status: filters?.status || 'ACTIVE',
    };

    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.buildingId) where.buildingId = filters.buildingId;
    if (filters?.category) where.category = filters.category;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { category: { contains: filters.search } },
      ];
    }

    // Role-based document access filter
    if (filters?.userRole && !['Super Admin', 'Builder Admin'].includes(filters.userRole)) {
      where.permissions = { in: ['ALL', 'PROJECT_TEAM'] };
    }

    return prisma.document.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true, code: true } },
        versions: { orderBy: { versionNumber: 'desc' } },
      },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  static async getDocumentById(id: string) {
    return prisma.document.findUnique({
      where: { id },
      include: {
        project: true,
        building: true,
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });
  }

  static async archiveDocument(id: string, userId?: string) {
    const doc = await prisma.document.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await AuditService.log({
      userId,
      action: 'ARCHIVE_DOCUMENT',
      module: 'DOCUMENT',
      recordId: id,
    });

    return doc;
  }

  static async deleteDocument(id: string, userId?: string) {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new Error('Document not found');

    // Soft delete or mark as DELETED
    const updated = await prisma.document.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    try {
      await RAGIngestionService.deleteDocument(id);
    } catch (err) {
      console.warn('RAG vector cleanup deferred:', err);
    }

    await AuditService.log({
      userId,
      action: 'DELETE_DOCUMENT',
      module: 'DOCUMENT',
      recordId: id,
      previousValue: { name: doc.name },
    });

    return updated;
  }
}
