import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import type { DocumentItem } from '../types/index.js';
import { UploadDocumentModal } from '../components/UploadDocumentModal.js';
import { useAuth } from '../context/AuthContext.js';
import {
  FileText,
  UploadCloud,
  Search,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';

interface DocumentsViewProps {
  projectId: string;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ projectId }) => {
  const { hasPermission } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getDocuments({
        projectId: projectId || undefined,
        category: categoryFilter || undefined,
        search: search || undefined,
      });
      setDocuments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [projectId, categoryFilter]);

  const canUpload = hasPermission('document.upload');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Document Management & Lifecycle Service</h2>
            <p className="text-xs text-slate-400">
              Secured file/object storage repository with versions, access control tiers & future RAG metadata
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canUpload && (
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by title or keyword..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-white focus:outline-none focus:border-sky-500 text-xs"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-sky-500 text-xs"
        >
          <option value="">All Categories</option>
          <option value="PERMITS">Permits & Approvals</option>
          <option value="CONTRACTS">Legal & Contracts</option>
          <option value="DRAWINGS">Engineering Drawings</option>
          <option value="COMPLIANCE">Compliance Evidence</option>
          <option value="FINANCIAL">Financial / Commercial</option>
        </select>
      </div>

      {/* Main Document Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Document Title</th>
                <th className="p-3">Category</th>
                <th className="p-3">Version</th>
                <th className="p-3">RBAC Tier</th>
                <th className="p-3">Future RAG Status</th>
                <th className="p-3">Uploaded By</th>
                <th className="p-3">Uploaded Date</th>
                <th className="p-3 text-right">File Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">Loading documents...</td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">No documents cataloged.</td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/40">
                    <td className="p-3">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        <span>{doc.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {doc.storageReference}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {doc.category}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1 w-max">
                        <Layers className="w-3 h-3" />
                        <span>v{doc.version}</span>
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 w-max ${
                          doc.permissions === 'ADMIN_ONLY'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        <span>{doc.permissions}</span>
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60">
                        {doc.ragStatus}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{doc.uploadedBy}</td>
                    <td className="p-3 text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</td>
                    <td className="p-3 text-right">
                      <a
                        href={`/uploads/${doc.storageReference}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold text-xs transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {uploadModalOpen && (
        <UploadDocumentModal
          projectId={projectId || 'default'}
          onClose={() => setUploadModalOpen(false)}
          onSuccess={loadDocuments}
        />
      )}
    </div>
  );
};
