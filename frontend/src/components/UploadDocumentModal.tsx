import React, { useState } from 'react';
import { ApiClient } from '../api/client.js';
import { X, UploadCloud, Sparkles } from 'lucide-react';

interface UploadDocumentModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  projectId,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('PERMITS');
  const [type, setType] = useState<string>('PDF');
  const [buildingId, setBuildingId] = useState<string>('');
  const [approvalStatus, setApprovalStatus] = useState<string>('APPROVED');
  const [textContent, setTextContent] = useState<string>('');
  const [permissions, setPermissions] = useState<string>('ALL');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !projectId) {
      setError('Please provide document title and select project');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append(
        'name',
        name.endsWith(`.${type.toLowerCase()}`) ? name : `${name}.${type.toLowerCase()}`
      );
      formData.append('category', category);
      formData.append('type', type);
      formData.append('permissions', permissions);
      formData.append('approvalStatus', approvalStatus);
      if (buildingId) formData.append('buildingId', buildingId);
      if (textContent.trim()) formData.append('textContent', textContent.trim());
      if (file) formData.append('file', file);

      await ApiClient.uploadDocument(formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Document upload failed. Check your role permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-300">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Upload Project Document</h2>
              <p className="text-[11px] text-slate-400">
                Metadata tagging & automated vector RAG ingestion into semantic database
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Document Title */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Document Title *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fire Department CFO Final NOC - Tower A & B"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Building / Tower & Approval Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Building / Tower *</label>
              <select
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
              >
                <option value="">Consolidated (All Towers)</option>
                <option value="tower-a">Tower A (Sapphire)</option>
                <option value="tower-b">Tower B (Emerald)</option>
                <option value="tower-c">Tower C (Ruby)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Approval Lifecycle *</label>
              <select
                value={approvalStatus}
                onChange={(e) => setApprovalStatus(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500 font-semibold"
              >
                <option value="APPROVED">APPROVED (Official Release)</option>
                <option value="DRAFT">DRAFT (Working Copy)</option>
                <option value="UNDER_REVIEW">UNDER REVIEW (Pending Signoff)</option>
              </select>
            </div>
          </div>

          {/* Category & File Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
              >
                <option value="PERMITS">Permits & Approvals</option>
                <option value="CONTRACTS">Legal & Contracts</option>
                <option value="DRAWINGS">Engineering Drawings</option>
                <option value="COMPLIANCE">Compliance Evidence</option>
                <option value="FINANCIAL">Financial / Commercial</option>
                <option value="SITE_PHOTOS">Site Execution Photos</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">File Format</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
              >
                <option value="PDF">PDF</option>
                <option value="DWG">DWG / CAD Drawing</option>
                <option value="EXCEL">Excel (.xlsx / .csv)</option>
                <option value="CONTRACT">Signed Contract</option>
              </select>
            </div>
          </div>

          {/* Document Content / Clauses for Instant RAG Vector Storage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Document Text / Clauses for Vector RAG (Optional / Paste Text)</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-mono">Dense Embeddings</span>
            </div>
            <textarea
              rows={3}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste key clauses, statutory conditions, specifications, or summary text here. This content is chunked and stored in the vector database so users can query it in Ask Project..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans text-xs"
            />
          </div>

          {/* Access Tier */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Access Tier (RBAC)</label>
            <select
              value={permissions}
              onChange={(e) => setPermissions(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Project Personnel (Normal Users + Admins)</option>
              <option value="ADMIN_ONLY">Super Admin Only</option>
            </select>
          </div>

          {/* File Attachment */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Attach File (Optional)</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="w-full text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-sky-400 hover:file:bg-slate-700 cursor-pointer"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{submitting ? 'Indexing into Vector DB...' : 'Upload & Store in Vector DB'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
