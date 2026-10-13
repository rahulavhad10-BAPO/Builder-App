import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import {
  ShieldCheck,
  CheckSquare,
  Calendar,
  X,
  PlusCircle,
  UploadCloud,
  FileText,
  Building,
  Layers,
  Save,
  Trash2,
  Check,
} from 'lucide-react';

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  targetDate?: string;
  remark?: string;
  docName?: string;
  docUrl?: string;
}

export interface ComplianceItemData {
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

const CATEGORY_DEFAULT_CHECKLISTS: Record<string, string[]> = {
  FIRE_SAFETY: [
    'Sprinkler pipeline hydrostatic pressure test certified (12 kg/cm²)',
    'Central wet riser 150mm NB integrity and internal hydrant landing valves verified',
    'Emergency fire booster pumps flow rate > 2000 LPM confirmed with diesel standby',
    'Stairwell positive pressurization fan automated smoke sensor cut-off cleared',
  ],
  ENVIRONMENT: [
    'State Pollution Control Board Consent to Establish (CTE) conditions compliance',
    'Effluent Treatment Plant (ETP) / Sewage Treatment Plant (STP) civil design verified',
    'Ambient air quality monitor logs and PM2.5 / PM10 dust barrier certificate submitted',
  ],
  QUALITY: [
    'Third-party structural stability assessment report from authorized institute (IIT/NIT)',
    'High-grade M35 concrete core crushing tests and slump test records verified',
    'Structural steel reinforcement Fe 550D mill test certificates filed',
  ],
  SAFETY: [
    'High-speed passenger elevator traction motor safety inspection clearance',
    'Emergency governor brake drop test and overspeed trip validation certified',
    'Lift hoistway shaft ventilation and pit buffer clearance endorsement received',
  ],
  RERA: [
    'Quarterly RERA project progress upload with certified architect completion certificate',
    'Quarterly CA-certified escrow account withdrawal reconciliation statement',
    'Sanctioned layout plan and encumbrance certificate verified on public portal',
  ],
  LABOUR: [
    'BOCW Labour welfare cess 1% deposit challan verified',
    'Site labour camp hygienic sanitation, potable water, and creche audit passed',
    'Workmen compensation insurance policy active and renewed',
  ],
};

export const ComplianceSection: React.FC<{
  projectId?: string;
  title?: string;
  showCreateButton?: boolean;
}> = ({ projectId, title = 'Statutory Clearances & Compliance Registry', showCreateButton = true }) => {
  const [items, setItems] = useState<ComplianceItemData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Checklist Modal
  const [activeModalItem, setActiveModalItem] = useState<ComplianceItemData | null>(null);
  const [modalChecklist, setModalChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistLabel, setNewChecklistLabel] = useState<string>('');
  const [savingProgress, setSavingProgress] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<string>('FIRE_SAFETY');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('Skyline Solitaire Towers');
  const [selectedTower, setSelectedTower] = useState<string>('Tower A');
  const [newDueDate, setNewDueDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [creationChecklists, setCreationChecklists] = useState<string[]>(
    CATEGORY_DEFAULT_CHECKLISTS['FIRE_SAFETY']
  );
  const [newCreationItemText, setNewCreationItemText] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);

  const handleCategoryChange = (cat: string) => {
    setNewCategory(cat);
    setCreationChecklists(CATEGORY_DEFAULT_CHECKLISTS[cat] || []);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await ApiClient.getCompliance({ projectId: projectId || undefined });
      setItems(list || []);
    } catch (e) {
      console.error('Failed to load compliance clearances:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const openChecklistModal = (item: ComplianceItemData) => {
    setActiveModalItem(item);
    setNewChecklistLabel('');
    setSaveSuccess(false);

    let parsedList: ChecklistItem[] = [];
    try {
      if (item.checklists) {
        parsedList = JSON.parse(item.checklists);
      }
    } catch {
      parsedList = [];
    }

    if (parsedList.length === 0) {
      const catDefaults = CATEGORY_DEFAULT_CHECKLISTS[item.category] || [
        'Technical documentation & authority application submitted',
        'Competent engineer on-site physical inspection cleared',
        'Final sanction order & verified certificate issued',
      ];
      parsedList = catDefaults.map((label, idx) => ({
        id: `chk-def-${idx + 1}`,
        label,
        checked: item.status === 'COMPLETED',
        targetDate: item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '',
        remark: '',
        docName: '',
      }));
    }

    setModalChecklist(parsedList);
  };

  const toggleChecklistItem = (id: string) => {
    setModalChecklist((prev) =>
      prev.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c))
    );
  };

  const updateChecklistRemark = (id: string, remark: string) => {
    setModalChecklist((prev) =>
      prev.map((c) => (c.id === id ? { ...c, remark } : c))
    );
  };

  const handleChecklistFileUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setModalChecklist((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                docName: file.name,
                docUrl: `https://docs.builderops.local/compliance/${file.name}`,
              }
            : c
        )
      );
    }
  };

  const handleAddChecklistItemToModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistLabel.trim()) return;

    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      label: newChecklistLabel.trim(),
      checked: false,
      targetDate: activeModalItem?.dueDate
        ? new Date(activeModalItem.dueDate).toISOString().split('T')[0]
        : '',
      remark: '',
      docName: '',
    };

    setModalChecklist((prev) => [...prev, newItem]);
    setNewChecklistLabel('');
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
        remarks: `Updated: ${modalChecklist.filter((c) => c.checked).length} of ${
          modalChecklist.length
        } items cleared.`,
      });

      await loadData();
      setSaveSuccess(true);
      setTimeout(() => {
        setActiveModalItem(null);
        setSaveSuccess(false);
      }, 700);
    } catch (e: any) {
      alert(e.message || 'Failed to save compliance progress');
    } finally {
      setSavingProgress(false);
    }
  };

  // Add Item to creation checklist
  const handleAddCreationItem = () => {
    if (newCreationItemText.trim()) {
      setCreationChecklists((prev) => [...prev, newCreationItemText.trim()]);
      setNewCreationItemText('');
    }
  };

  const handleCreateCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creationChecklists.length === 0) {
      alert('Please include at least one checklist item');
      return;
    }
    setCreating(true);

    try {
      const categoryTitles: Record<string, string> = {
        FIRE_SAFETY: 'Fire Safety CFO NOC Clearance',
        ENVIRONMENT: 'SPCB Environmental Clearance & CTE',
        QUALITY: 'IIT Structural Stability Certification',
        SAFETY: 'Elevator & Lift Machinery License',
        RERA: 'RERA Compliance & Project Disclosures',
        LABOUR: 'BOCW Labour Welfare Cess Clearance',
      };

      const title = `${categoryTitles[newCategory] || 'Statutory Clearance'} - ${selectedTower}`;

      const formattedChecklists: ChecklistItem[] = creationChecklists.map((label, idx) => ({
        id: `chk-init-${idx + 1}`,
        label: label.trim(),
        checked: false,
        targetDate: newDueDate,
        remark: '',
        docName: '',
      }));

      await ApiClient.createComplianceItem({
        category: newCategory,
        name: title,
        building: selectedBuilding,
        tower: selectedTower,
        dueDate: newDueDate,
        checklists: formattedChecklists,
      });

      await loadData();
      setCreateModalOpen(false);
      setNewCreationItemText('');
      setCreationChecklists(CATEGORY_DEFAULT_CHECKLISTS['FIRE_SAFETY']);
    } catch (err: any) {
      alert(err.message || 'Failed to create compliance clearance');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{title}</h3>
            <p className="text-[11px] text-slate-400">
              Clearances with dynamic checklists, remarks per item & evidence uploads
            </p>
          </div>
        </div>

        {showCreateButton && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Clearance</span>
          </button>
        )}
      </div>

      {/* Clearances Cards Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 text-xs">Loading statutory clearances...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <p>No statutory compliance clearances created yet.</p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="text-emerald-400 hover:text-emerald-300 font-semibold underline text-xs cursor-pointer"
          >
            Click here to create your first compliance clearance
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {items.map((item) => {
            let checklistCount = 0;
            let checkedCount = 0;
            try {
              if (item.checklists) {
                const list: ChecklistItem[] = JSON.parse(item.checklists);
                checklistCount = list.length;
                checkedCount = list.filter((c) => c.checked).length;
              }
            } catch {
              checklistCount = 3;
            }

            const pct = item.progressPercent !== undefined ? Math.round(item.progressPercent) : 0;

            return (
              <div
                key={item.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-sky-400 border border-slate-800">
                      {item.category.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : item.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-xs leading-snug">{item.name}</h4>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>Target Closure:</span>
                    <span className="font-mono text-white font-semibold">
                      {new Date(item.dueDate).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Checklist Completion</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        {checkedCount}/{checklistCount} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {checklistCount} Milestone Items
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

      {/* Interactive Checklist Modal with Comments & Per-Item Upload */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{activeModalItem.name}</h3>
                  <p className="text-[11px] text-slate-400">
                    Category: <span className="text-white font-semibold">{activeModalItem.category}</span> &bull; Target Closure:{' '}
                    <span className="text-sky-400 font-mono font-bold">
                      {new Date(activeModalItem.dueDate).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
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
              {/* Overall Progress Bar */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">Target Closure Progress</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {calculateModalProgress()}% Completed ({modalChecklist.filter((c) => c.checked).length} of{' '}
                    {modalChecklist.length} Checked)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-300 rounded-full"
                    style={{ width: `${calculateModalProgress()}%` }}
                  ></div>
                </div>
              </div>

              {/* Checklist Table with Checkbox, Item, Closure Date, Comments Box, and Upload Doc Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Inspection Checklist & Supporting Evidence:</span>
                  <span className="text-[10px] text-slate-500 font-normal">Check off items & attach documents</span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5 w-12 text-center">Status</th>
                          <th className="p-2.5">Checklist Item</th>
                          <th className="p-2.5 w-48">Comments / Remarks</th>
                          <th className="p-2.5 w-36 text-center">Upload Document</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                        {modalChecklist.map((c) => (
                          <tr
                            key={c.id}
                            className={`transition-colors ${
                              c.checked ? 'bg-emerald-950/20' : 'hover:bg-slate-800/40'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="p-2.5 text-center align-middle">
                              <input
                                type="checkbox"
                                checked={c.checked}
                                onChange={() => toggleChecklistItem(c.id)}
                                className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                              />
                            </td>

                            {/* Checklist Item */}
                            <td className="p-2.5 align-middle">
                              <div
                                className={`font-medium ${
                                  c.checked ? 'text-emerald-300 line-through' : 'text-slate-200'
                                }`}
                              >
                                {c.label}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Closure Date:{' '}
                                {c.targetDate ||
                                  (activeModalItem?.dueDate
                                    ? new Date(activeModalItem.dueDate).toLocaleDateString([], {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })
                                    : '30 Days')}
                              </div>
                            </td>

                            {/* Comments Box */}
                            <td className="p-2.5 align-middle">
                              <input
                                type="text"
                                value={c.remark || ''}
                                onChange={(e) => updateChecklistRemark(c.id, e.target.value)}
                                placeholder="Add comments / remarks..."
                                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-emerald-500"
                              />
                            </td>

                            {/* Upload Doc Button */}
                            <td className="p-2.5 text-center align-middle">
                              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors text-[11px] font-semibold">
                                <UploadCloud className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span>{c.docName ? 'Replace' : 'Upload Doc'}</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => handleChecklistFileUpload(c.id, e)}
                                />
                              </label>
                              {c.docName && (
                                <div className="text-[10px] text-emerald-400 font-mono truncate max-w-[120px] mx-auto mt-1 flex items-center justify-center gap-1">
                                  <FileText className="w-3 h-3 shrink-0" />
                                  <span title={c.docName}>{c.docName}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Add New Checklist Item */}
              <form onSubmit={handleAddChecklistItemToModal} className="flex items-center gap-2 pt-1">
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
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Checklist</span>
                </button>
              </form>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveModalItem(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalProgress}
                  disabled={savingProgress}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingProgress ? 'Saving...' : 'Save Checklist Progress'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create New Statutory Compliance Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Create New Statutory Compliance</h3>
                  <p className="text-[11px] text-slate-400">Configure category, building, tower, closure date & checklists</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCompliance} className="p-5 space-y-3.5 text-xs">
              {/* Category */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Compliance Category *</span>
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                >
                  <option value="FIRE_SAFETY">Fire Safety NOC (CFO Approval)</option>
                  <option value="ENVIRONMENT">Environmental Clearance (SPCB / CTE)</option>
                  <option value="QUALITY">Structural Stability Certification (IIT/NIT)</option>
                  <option value="SAFETY">Lift & Machinery License</option>
                  <option value="RERA">RERA Project Disclosures & Escrow</option>
                  <option value="LABOUR">Labour Welfare Cess & BOCW</option>
                </select>
              </div>

              {/* Building & Tower */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-sky-400" />
                    <span>Select Building *</span>
                  </label>
                  <select
                    value={selectedBuilding}
                    onChange={(e) => setSelectedBuilding(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Skyline Solitaire Towers">Skyline Solitaire Towers</option>
                    <option value="The Grand Pinnacle Heights">The Grand Pinnacle Heights</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Select Tower *</span>
                  </label>
                  <select
                    value={selectedTower}
                    onChange={(e) => setSelectedTower(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                  >
                    <option value="Tower A">Tower A (Sapphire)</option>
                    <option value="Tower B">Tower B (Emerald)</option>
                    <option value="Tower C">Tower C (Ruby)</option>
                    <option value="All Towers">All Towers (Site-wide)</option>
                  </select>
                </div>
              </div>

              {/* Target Closure Date */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-400" />
                  <span>Select Target Closure Date *</span>
                </label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Checklist Items Provision */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Checklist Items Provision ({creationChecklists.length} Items) *</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">Pre-filled for selected category</span>
                </label>

                {/* Checklist items list */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {creationChecklists.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px]"
                    >
                      <span className="text-slate-300 leading-snug flex-1">{item}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCreationChecklists(creationChecklists.filter((_, i) => i !== idx))
                        }
                        className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                        title="Remove requirement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Input + Add Item Button (Supports typing and Enter key!) */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newCreationItemText}
                    onChange={(e) => setNewCreationItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCreationItem();
                      }
                    }}
                    placeholder="Type custom checklist requirement & press Enter or Add..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCreationItem}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || creationChecklists.length === 0}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{creating ? 'Creating Clearance...' : 'Create Clearance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
