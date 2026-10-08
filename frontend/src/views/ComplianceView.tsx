import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import {
  ShieldCheck,
  CheckSquare,
  Calendar,
  User,
  X,
  FileCheck2,
  CheckCircle2,
} from 'lucide-react';

interface ComplianceViewProps {
  projectId: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export const ComplianceView: React.FC<ComplianceViewProps> = ({ projectId }) => {
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeModalItem, setActiveModalItem] = useState<any | null>(null);
  const [modalChecklist, setModalChecklist] = useState<ChecklistItem[]>([]);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([
        ApiClient.getCompliance({ projectId: projectId || undefined }),
        ApiClient.getComplianceSummary(projectId || undefined),
      ]);
      setItems(list);
      setSummary(sum);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Open the interactive Checklist & Evidence popup
  const openChecklistModal = (item: any) => {
    setActiveModalItem(item);
    setUploadedDocName(null);

    // Provide default structured checklist items if not already present
    const defaultChecklist: ChecklistItem[] = [
      { id: 'c1', label: 'Liaison authority application form & scrutiny fees deposited', checked: item.status === 'COMPLETED' },
      { id: 'c2', label: 'Chartered Engineer / Architect technical validation completed', checked: item.status === 'COMPLETED' },
      { id: 'c3', label: 'On-site statutory audit & site inspection concluded', checked: item.status === 'COMPLETED' },
      { id: 'c4', label: 'Final sanction order & verified certificate issued by competent authority', checked: item.status === 'COMPLETED' },
    ];
    setModalChecklist(defaultChecklist);
  };

  const toggleChecklistItem = (id: string) => {
    setModalChecklist(prev =>
      prev.map(c => (c.id === id ? { ...c, checked: !c.checked } : c))
    );
  };

  const calculateModalProgress = () => {
    if (modalChecklist.length === 0) return 0;
    const checkedCount = modalChecklist.filter(c => c.checked).length;
    // Add bonus if doc evidence uploaded
    let pct = Math.round((checkedCount / modalChecklist.length) * 100);
    return Math.min(100, pct);
  };

  const handleSaveModalProgress = async () => {
    if (!activeModalItem) return;
    setSavingProgress(true);
    try {
      const progressPct = calculateModalProgress();
      const newStatus = progressPct === 100 ? 'COMPLETED' : progressPct > 0 ? 'IN_PROGRESS' : 'PENDING';
      
      await ApiClient.updateComplianceItem(activeModalItem.id, {
        status: newStatus,
        remarks: `Checklist verified (${progressPct}% progress). ${uploadedDocName ? `Uploaded evidence: ${uploadedDocName}` : ''}`,
      });
      await loadData();
      setActiveModalItem(null);
    } catch (e: any) {
      alert(e.message || 'Failed to save compliance progress');
    } finally {
      setSavingProgress(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedDocName(file.name);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Dynamic Scorecard */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Statutory & Regulatory Compliance Command</h2>
            <p className="text-xs text-slate-400">
              Clearance registry with compliance owner, due dates, interactive checklist workflows & evidence attachment
            </p>
          </div>
        </div>

        {summary && (
          <div className="flex items-center gap-4 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Overall Compliance Score</div>
              <div className="text-lg font-black text-emerald-400">
                {summary.compliancePercentage}%
              </div>
              <div className="text-[10px] text-slate-500">
                {summary.completed} of {summary.totalApplicable} clearances completed
              </div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 flex items-center justify-center font-bold text-xs text-white">
              {summary.compliancePercentage}%
            </div>
          </div>
        )}
      </div>

      {/* Main Compliance Registry Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Statutory Clearance / License</th>
                <th className="p-3">Category</th>
                <th className="p-3">Designated Owner</th>
                <th className="p-3">Due Date</th>
                <th className="p-3">Compliance Progress</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Interactive Checklist</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading statutory checklist...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">No compliance items registered.</td>
                </tr>
              ) : (
                items.map((item) => {
                  const isCompleted = item.status === 'COMPLETED';
                  const isInProgress = item.status === 'IN_PROGRESS';
                  const progressPct = isCompleted ? 100 : isInProgress ? 60 : 0;
                  const ownerName = item.assignedOwner || item.owner || 'Liaison Head';
                  const dueDateFormatted = item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN') : 'Ongoing';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-white text-xs">{item.title}</div>
                        {item.remarks && <div className="text-[10px] text-slate-400 mt-0.5">{item.remarks}</div>}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 text-slate-200">
                        <div className="flex items-center gap-1.5 font-medium">
                          <User className="w-3.5 h-3.5 text-sky-400" />
                          <span>{ownerName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-300">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>{dueDateFormatted}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden mb-1">
                          <div
                            className={`h-2 rounded-full ${isCompleted ? 'bg-emerald-500' : isInProgress ? 'bg-amber-500' : 'bg-slate-700'}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{progressPct}% Verified</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isCompleted
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : isInProgress
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => openChecklistModal(item)}
                          className="px-2.5 py-1 rounded bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 font-semibold border border-sky-500/30 text-xs flex items-center gap-1.5 ml-auto cursor-pointer transition-colors"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                          <span>Checklist & Docs</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Checklist & Document Upload Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Compliance Checklist & Evidence</h3>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Compliance Info Banner */}
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800 grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 block">Clearance Name</span>
                <span className="font-bold text-white">{activeModalItem.title}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Assigned Owner</span>
                <span className="font-semibold text-sky-400">
                  {activeModalItem.assignedOwner || activeModalItem.owner || 'Liaison Head'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Target Due Date</span>
                <span className="font-mono text-amber-300">
                  {activeModalItem.dueDate ? new Date(activeModalItem.dueDate).toLocaleDateString('en-IN') : 'Ongoing'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Current Calculated Progress</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {calculateModalProgress()}% Complete
                </span>
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2">
              <label className="block text-slate-300 font-bold mb-1">
                Mandatory Verification Steps (Check items to update progress)
              </label>
              <div className="space-y-2">
                {modalChecklist.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      c.checked
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-200'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800/70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={c.checked}
                      onChange={() => toggleChecklistItem(c.id)}
                      className="mt-0.5 rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="leading-snug">{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Document Evidence Upload */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
              <label className="block text-slate-300 font-bold">
                Attach Clearance Certificate / Government Sanction Evidence
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.dwg"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
                />
              </div>
              {uploadedDocName && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Document attached: {uploadedDocName}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingProgress}
                onClick={handleSaveModalProgress}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>{savingProgress ? 'Saving...' : 'Update & Mark Progress'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
