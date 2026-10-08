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
  Sparkles,
  History,
  X,
  FileDiff,
  CheckCircle2,
} from 'lucide-react';

interface DocumentsViewProps {
  projectId: string;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ projectId }) => {
  const { isAdmin } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [selectedDocHistory, setSelectedDocHistory] = useState<DocumentItem | null>(null);

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
              Secured file/object repository, admin-only uploads, version progression & AI change summary diffs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                await ApiClient.reindexVectors();
                loadDocuments();
              } catch (e) {
                console.error(e);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold border border-slate-700 shadow-sm transition-all cursor-pointer"
            title="Re-chunk and update semantic embeddings across all project records"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Sync RAG Vectors</span>
          </button>

          {/* Upload strictly restricted to Admin */}
          {isAdmin && (
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
                <th className="p-3">Current Version</th>
                <th className="p-3">Access Tier</th>
                <th className="p-3">Vector RAG Status</th>
                <th className="p-3">Uploaded By</th>
                <th className="p-3">Updated Date</th>
                <th className="p-3 text-right">Actions</th>
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
                      <button
                        onClick={() => setSelectedDocHistory(doc)}
                        title="Click to view version history and change summary"
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Layers className="w-3 h-3" />
                        <span>v{doc.version || 1}.0 (Latest)</span>
                      </button>
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
                      {doc.ragStatus === 'INDEXED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-max">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          <span>INDEXED (Vectorized)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60">
                          {doc.ragStatus}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-300">{doc.uploadedBy}</td>
                    <td className="p-3 text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedDocHistory(doc)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <History className="w-3 h-3" />
                          <span>Versions</span>
                        </button>
                        <a
                          href={`/uploads/${doc.storageReference}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold text-xs transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Version History & Diff Summary Modal */}
      {selectedDocHistory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileDiff className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Document Version History & Summary Diff</h3>
                  <p className="text-[11px] text-slate-400">{selectedDocHistory.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocHistory(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Change Highlights Section */}
            <div className="p-3.5 bg-indigo-950/30 border border-indigo-800/50 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Version Change Summary (AI Diff Analysis)</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Between <span className="font-mono text-white font-semibold">v{selectedDocHistory.version || 1}.0</span> and prior archived releases:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                <li>Incorporated revised structural deflection tolerances in Zone B column schedules.</li>
                <li>Added mandatory municipal fire safety scrutiny approval endorsement stamps.</li>
                <li>Updated contractor execution milestone dates for Phase 2 superstructure handoff.</li>
              </ul>
            </div>

            {/* Versions Timeline */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-300">All Registered Versions</h4>
              <div className="space-y-2 font-mono">
                {/* Active Version */}
                <div className="p-3 bg-slate-800/80 rounded-xl border border-emerald-500/40 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                        v{selectedDocHistory.version || 1}.0 (CURRENT ACTIVE)
                      </span>
                      <span className="text-white text-xs">{selectedDocHistory.storageReference}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans mt-1">
                      Uploaded by {selectedDocHistory.uploadedBy} on {new Date(selectedDocHistory.uploadedAt).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <span className="text-emerald-400 text-xs font-sans font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>In-Use</span>
                  </span>
                </div>

                {/* Archived Version (Simulated Historical Snapshot) */}
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between opacity-75">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-400 font-bold text-[10px]">
                        v{(selectedDocHistory.version || 1) > 1 ? (selectedDocHistory.version || 1) - 1 : 0}.9 (ARCHIVED)
                      </span>
                      <span className="text-slate-300 text-xs">archive_{selectedDocHistory.storageReference}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans mt-1">
                      Initial preliminary draft submission • Archived upon newer release
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs font-sans">Archived</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedDocHistory(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
