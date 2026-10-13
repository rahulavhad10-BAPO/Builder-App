import fs from 'fs';
import path from 'path';

export interface ChunkResult {
  chunkIndex: number;
  content: string;
  metadata: {
    sourceType: 'DOCUMENT' | 'DRAWING';
    documentId?: string;
    drawingId?: string;
    title: string;
    category: string;
    projectId?: string;
    buildingId?: string | null;
    version?: number | string;
    chunkIndex: number;
    totalChunks: number;
    charCount: number;
  };
}

export class DocumentChunker {
  private static CHUNK_SIZE = 650;
  private static CHUNK_OVERLAP = 120;

  /**
   * Extract readable text from storage reference or raw content
   */
  static extractTextFromStorage(storageReference: string, baseDir = './uploads'): string {
    const possiblePaths = [
      path.resolve(baseDir, storageReference),
      path.resolve(process.cwd(), baseDir, storageReference),
      path.resolve(process.cwd(), storageReference),
      path.resolve(process.cwd(), 'uploads', path.basename(storageReference)),
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            const buffer = fs.readFileSync(filePath);
            const content = buffer.toString('utf-8');
            // Basic heuristic to filter binary junk
            const printableRatio = (content.match(/[\x20-\x7E\r\n\t]/g) || []).length / (content.length || 1);
            if (printableRatio > 0.6) {
              return content;
            }
          }
        } catch (e) {
          console.warn(`Failed reading file at ${filePath}:`, e);
        }
      }
    }

    return '';
  }

  /**
   * Chunks a raw text string into overlapping, sentence-aware pieces
   */
  static splitIntoChunks(text: string, contextHeader = ''): string[] {
    const cleaned = text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();
    if (!cleaned) return [];

    if (cleaned.length <= this.CHUNK_SIZE) {
      return [contextHeader ? `${contextHeader}\n\n${cleaned}` : cleaned];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < cleaned.length) {
      let end = start + this.CHUNK_SIZE;

      if (end >= cleaned.length) {
        const slice = cleaned.slice(start).trim();
        if (slice.length > 20) {
          chunks.push(contextHeader ? `${contextHeader}\n\n${slice}` : slice);
        }
        break;
      }

      // Find natural boundary (newline, period, question mark, exclamation, or space)
      const lookbackWindow = cleaned.slice(Math.max(start, end - 150), end);
      const boundaryMatch = lookbackWindow.search(/(\n\n|\.\s|\?\s|!\s|\n)(?!.*(\n\n|\.\s|\?\s|!\s|\n))/);

      if (boundaryMatch !== -1) {
        end = Math.max(start, end - 150) + boundaryMatch + 1;
      }

      const chunkText = cleaned.slice(start, end).trim();
      if (chunkText.length > 30) {
        chunks.push(contextHeader ? `${contextHeader}\n\n${chunkText}` : chunkText);
      }

      // Step forward with overlap
      const nextStart = end - this.CHUNK_OVERLAP;
      start = nextStart > start ? nextStart : end;
    }

    return chunks;
  }

  /**
   * Process a document into indexed chunk representations
   */
  static processDocument(
    doc: {
      id: string;
      name: string;
      category: string;
      type: string;
      version: number;
      projectId: string;
      buildingId?: string | null;
      buildingName?: string | null;
      storageReference: string;
      approvalStatus?: string | null;
      textContent?: string | null;
    },
    rawTextContent?: string
  ): ChunkResult[] {
    const fileExtracted = this.extractTextFromStorage(doc.storageReference);
    const bodyContent = (rawTextContent || doc.textContent || fileExtracted || '').trim();

    // Context Header provides strong semantic anchor to every chunk
    const statusTag = doc.approvalStatus ? ` | APPROVAL: ${doc.approvalStatus}` : '';
    const buildingTag = doc.buildingName ? ` | TOWER: ${doc.buildingName}` : '';
    const contextHeader = `[DOCUMENT RECORD: "${doc.name}" | CATEGORY: ${doc.category} | TYPE: ${doc.type} | VERSION: v${doc.version}${statusTag}${buildingTag}]`;

    // Construct enriched full text
    const fullText = bodyContent
      ? `${bodyContent}`
      : `Document Record: ${doc.name}. Category: ${doc.category}. File Type: ${doc.type}. Version: ${doc.version}. Reference: ${doc.storageReference}. Approval: ${doc.approvalStatus || 'APPROVED'}.`;

    const rawChunks = this.splitIntoChunks(fullText, contextHeader);

    return rawChunks.map((content, idx) => ({
      chunkIndex: idx,
      content,
      metadata: {
        sourceType: 'DOCUMENT',
        documentId: doc.id,
        title: doc.name,
        category: doc.category,
        projectId: doc.projectId,
        buildingId: doc.buildingId,
        buildingName: doc.buildingName,
        approvalStatus: doc.approvalStatus || 'APPROVED',
        version: doc.version,
        chunkIndex: idx,
        totalChunks: rawChunks.length,
        charCount: content.length,
      },
    }));
  }

  /**
   * Process a drawing record into indexed chunk representations
   */
  static processDrawing(
    drawing: {
      id: string;
      drawingNumber: string;
      name: string;
      revision: string;
      category: string;
      projectId: string;
      buildingId?: string | null;
      fileUrl: string;
      uploadedBy?: string;
    },
    specDetails?: string
  ): ChunkResult[] {
    const contextHeader = `[ENGINEERING DRAWING: "${drawing.drawingNumber} - ${drawing.name}" | DISCIPLINE: ${drawing.category} | REVISION: ${drawing.revision}]`;

    const drawingText = `Engineering Drawing ${drawing.drawingNumber}: "${drawing.name}".
Discipline/Category: ${drawing.category}.
Revision: ${drawing.revision}.
Project ID: ${drawing.projectId}.
Building: ${drawing.buildingId || 'Entire Project'}.
File Reference: ${drawing.fileUrl}.
Uploaded By: ${drawing.uploadedBy || 'Engineering Team'}.
${specDetails || 'Official issued architectural/structural engineering drawing registered in Command Center.'}`;

    const rawChunks = this.splitIntoChunks(drawingText, contextHeader);

    return rawChunks.map((content, idx) => ({
      chunkIndex: idx,
      content,
      metadata: {
        sourceType: 'DRAWING',
        drawingId: drawing.id,
        title: `${drawing.drawingNumber} - ${drawing.name}`,
        category: drawing.category,
        projectId: drawing.projectId,
        buildingId: drawing.buildingId,
        version: drawing.revision,
        chunkIndex: idx,
        totalChunks: rawChunks.length,
        charCount: content.length,
      },
    }));
  }
}
