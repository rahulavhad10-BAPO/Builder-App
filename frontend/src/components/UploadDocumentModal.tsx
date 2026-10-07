import React, { useState } from 'react';
import { ApiClient } from '../api/client.js';
import { X, UploadCloud, FileCheck } from 'lucide-react';

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
      formData.append('name', name.endsWith(`.${type.toLowerCase()}`) ? name : `${name}.${type.toLowerCase()}`);
      formData.append('category', category);
      formData.append('type', type);
      formData.append('permissions', permissions);
      if (file) {
        formData.append('file', file);
      }

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-300">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white">Upload Project Document</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Document Title *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fire Safety CFO Approval - Phase 1"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

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
                <option value="SITE_PHOTOS">Site Photos</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">File Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
              >
                <option value="PDF">PDF</option>
                <option value="DWG">DWG / CAD</option>
                <option value="EXCEL">Excel (.xlsx)</option>
                <option value="CONTRACT">Signed Contract</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Access Tier (RBAC)</label>
            <select
              value={permissions}
              onChange={(e) => setPermissions(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Project Personnel</option>
              <option value="PROJECT_TEAM">Project Management Team</option>
              <option value="ADMIN_ONLY">Super Admin & Builder Admin Only</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Attach File (Optional)</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="w-full text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-sky-400 hover:file:bg-slate-700 cursor-pointer"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>{submitting ? 'Uploading...' : 'Save Document'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
