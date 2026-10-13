import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  ShieldCheck,
  CheckSquare,
  Calendar,
  User,
  X,
  FileCheck2,
  CheckCircle2,
  PlusCircle,
  UploadCloud,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface ComplianceItemData {
  id: string;
  name: string;
  category: string;
  description: string;
  ownerName: string;
  dueDate: string;
  frequency: string;
  status: string;
  remarks?: string;
  evidence?: string;
  docUrl?: string;
  progressPercent?: number;
  checklists?: string;
  building?: { name: string };
}

export const ComplianceView: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<ComplianceItemData[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Checklist Modal
  const [activeModalItem, setActiveModalItem] = useState<ComplianceItemData | null>(null);
  const [modalChecklist, setModalChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistLabel, setNewChecklistLabel] = useState<string>('');
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState<boolean>(false);

  // New Compliance Clearance Creation Modal
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('FIRE_SAFETY');
  const [newOwner, setNewOwner] = useState<string>('Deepa Nair');
  const [newDueDate, setNewDueDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [newChecklistText, setNewChecklistText] = useState<string>(
    'Sprinkler pipeline hydrostatic pressure test certified (12 kg/cm²)\nCentral wet riser 150mm NB integrity verified\nEmergency fire pump booster flow rate > 2000 LPM confirmed\nStairwell positive pressurization fan automated cut-off tested'
  );
  const [creating, setCreating] = useState<boolean>(false);

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
  const openChecklistModal = (item: ComplianceItemData) => {
    setActiveModalItem(item);
    setUploadedDocName(item.evidence ? item.evidence.split('/').pop() || 'cert-verified.pdf' : null);
    setNewChecklistLabel('');

    let parsedList: ChecklistItem[] = [];
    try {
      if (item.checklists) {
        parsedList = JSON.parse(item.checklists);
      }
    } catch {
      parsedList = [];
    }

    if (parsedList.length === 0) {
      parsedList = [
        { id: 'c1', label: 'Technical documentation & authority application submitted', checked: item.status === 'COMPLETED' },
        { id: 'c2', label: 'Competent engineer on-site physical inspection cleared', checked: item.status === 'COMPLETED' },
        { id: 'c3', label: 'Final sanction order & verified certificate issued', checked: item.status === 'COMPLETED' },
      ];
    }

    setModalChecklist(parsedList);
  };

  const toggleChecklistItem = (id: string) => {
    setModalChecklist((prev) =>
      prev.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c))
    );
  };

  const handleAddChecklistItemToModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistLabel.trim()) return;

    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}`,
      label: newChecklistLabel.trim(),
      checked: false,
    };

    const updated = [...modalChecklist, newItem];
    setModalChecklist(updated);
    setNewChecklistLabel('');

    // If active modal item exists, call backend to persist
    if (activeModalItem) {
      try {
        await ApiClient.addComplianceChecklistItem(activeModalItem.id, newItem.label);
      } catch (err) {
        console.warn('Deferred adding checklist item to backend:', err);
      }
    }
  };

  const calculateModalProgress = () => {
    if (modalChecklist.length === 0) return 0;
    const checkedCount = modalChecklist.filter((c) => c.checked).length;
    return Math.round((checkedCount / modalChecklist.length) * 100);
  };

  const handleSaveModalProgress = async () => {
    if (!activeModalItem) return;
    setSavingProgress(true);
    try {
      const progressPct = calculateModalProgress();
      const newStatus =
        progressPct === 100 ? 'COMPLETED' : progressPct > 0 ? 'IN_PROGRESS' : 'PENDING';

      await ApiClient.updateComplianceItem(activeModalItem.id, {
        status: newStatus,
        checklists: modalChecklist,
        progressPercent: progressPct,
        remarks: `Checklist verified (${progressPct}% progress). ${
          uploadedDocName ? `Uploaded evidence: ${uploadedDocName}` : ''
        }`,
        evidence: uploadedDocName ? `https://docs.builderops.local/${uploadedDocName}` : undefined,
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

  const handleCreateCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    try {
      const checklistArray = newChecklistText
        .split('\n')
        .filter((l) => l.trim())
        .map((label, idx) => ({
          id: `c-init-${idx + 1}`,
          label: label.trim(),
          checked: false,
        }));

      await ApiClient.createComplianceItem({
        name: newName,
        category: newCategory,
        description: `Statutory compliance verification for ${newName}`,
        projectId,
        ownerName: newOwner,
        dueDate: newDueDate,
        checklists: checklistArray,
      });

      await loadData();
      setCreateModalOpen(false);
      setNewName('');
    } catch (err: any) {
      alert(err.message || 'Failed to create compliance clearance');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Dynamic Scorecard */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Statutory & Regulatory Compliance Command</h2>
            <p className="text-xs text-slate-400">
              Clearance registry with compliance owners, interactive checklists, dynamic item additions & evidence uploads
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {summary && (
            <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Overall Score</div>
                <div className="text-base font-black text-emerald-400">
                  {summary.compliancePercentage}%
                </div>
              </div>
              <div className="w-10 h-10 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 flex items-center justify-center font-bold text-[11px] text-white">
                {summary.compliancePercentage}%
              </div>
            </div>
          )}

          {isAdmin && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Clearance</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Compliance Registry Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">Loading statutory compliance records...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            let checklistsParsed: ChecklistItem[] = [];
            try {
              if (item.checklists) checklistsParsed = JSON.parse(item.checklists);
            } catch {
              checklistsParsed = [];
            }

            const totalChecks = checklistsParsed.length || 3;
            const completedChecks = checklistsParsed.filter((c) => c.checked).length;
            const progress =
              item.progressPercent !== undefined
                ? Math.round(item.progressPercent)
                : totalChecks > 0
                ? Math.round((completedChecks / totalChecks) * 100)
                : item.status === 'COMPLETED'
                ? 100
                : 0;

            const isCompleted = item.status === 'COMPLETED' || progress === 100;

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950 text-sky-400 border border-slate-800">
                      {item.category.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : progress > 0
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : null}
                      <span>{isCompleted ? 'COMPLIANT' : progress > 0 ? 'IN PROGRESS' : 'PENDING'}</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-xs leading-snug">{item.name}</h3>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Checklist Completion</span>
                      <span className="font-mono font-bold text-white">{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          progress === 100 ? 'bg-emerald-500' : progress > 50 ? 'bg-amber-400' : 'bg-sky-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Meta details */}
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400 pt-1">
                    <div className="flex items-center gap-1 truncate">
                      <User className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{item.ownerName}</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end font-mono">
                      <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>{new Date(item.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {item.remarks && (
                    <p className="text-[10px] text-slate-500 line-clamp-2 italic bg-slate-950/40 p-1.5 rounded border border-slate-800/60">
                      "{item.remarks}"
                    </p>
                  )}
                </div>

                {/* Card Action */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    {totalChecks} Checklist Criteria
                  </span>
                  <button
                    onClick={() => openChecklistModal(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-bold border border-sky-500/30 transition-colors cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Open Checklist</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Interactive Checklist & Upload Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{activeModalItem.name}</h3>
                  <p className="text-[11px] text-slate-400">
                    Owner: <span className="text-white font-semibold">{activeModalItem.ownerName}</span> &bull; Due:{' '}
                    <span className="text-sky-400 font-mono">
                      {new Date(activeModalItem.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Progress Bar in Modal */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">Statutory Clearance Progress</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {calculateModalProgress()}% Completed
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-300 rounded-full"
                    style={{ width: `${calculateModalProgress()}%` }}
                  ></div>
                </div>
              </div>

              {/* Checklist Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Mandatory Inspection Checklist:</span>
                  <span className="text-[10px] text-slate-500">
                    {modalChecklist.filter((c) => c.checked).length} of {modalChecklist.length} Checked
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {modalChecklist.map((c) => (
                    <label
                      key={c.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        c.checked
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={c.checked}
                        onChange={() => toggleChecklistItem(c.id)}
                        className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="leading-relaxed select-none">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Add New Checklist Item Input */}
              <form onSubmit={handleAddChecklistItemToModal} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newChecklistLabel}
                  onChange={(e) => setNewChecklistLabel(e.target.value)}
                  placeholder="Add new checklist requirement on the fly..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
                />
                <button
                  type="submit"
                  disabled={!newChecklistLabel.trim()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Checklist Item</span>
                </button>
              </form>

              {/* Evidence Attachment */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
                  <span>Upload Document / Evidence against Clearance:</span>
                </div>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="w-full text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-sky-400 hover:file:bg-slate-700 cursor-pointer"
                />
                {uploadedDocName && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Attached Evidence: {uploadedDocName}</span>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModalItem(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingProgress}
                  onClick={handleSaveModalProgress}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingProgress ? 'Saving...' : 'Save & Update Progress'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. New Compliance Clearance Creation Modal (Admin Only) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-sm">Add New Statutory Clearance</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCompliance} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Clearance / Document Title *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Fire Department CFO Final NOC Approval"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Compliance Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="FIRE_SAFETY">Fire Safety NOC</option>
                    <option value="ENVIRONMENT">Environmental Clearance</option>
                    <option value="QUALITY">Structural Stability</option>
                    <option value="SAFETY">Lift & Machinery License</option>
                    <option value="RERA">RERA Disclosures</option>
                    <option value="LABOUR">Labour Cess & Welfare</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Responsible Owner *</label>
                  <input
                    type="text"
                    required
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    placeholder="e.g. Deepa Nair"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Compliance Due Date *</label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Initial Checklists (Enter one checklist item per line) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  placeholder="Checklist Item 1: ...&#10;Checklist Item 2: ..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{creating ? 'Creating...' : 'Create Clearance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
