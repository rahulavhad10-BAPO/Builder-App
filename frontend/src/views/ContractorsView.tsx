import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  HardHat,
  PlusCircle,
  CheckCircle2,
  Clock,
  Briefcase,
  X,
  FileCheck2,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

export const ContractorsView: React.FC = () => {
  const { isAdmin } = useAuth();
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedContractorId, setExpandedContractorId] = useState<string | null>(null);

  // Assign Work Package Modal
  const [assignModalContractor, setAssignModalContractor] = useState<any | null>(null);
  const [workPackageTitle, setWorkPackageTitle] = useState<string>('');
  const [contractValue, setContractValue] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [milestonesInput, setMilestonesInput] = useState<string>('');
  const [savingPackage, setSavingPackage] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Log Progress Note (RAG-Enabled) Modal
  const [progressModalContractor, setProgressModalContractor] = useState<any | null>(null);
  const [progressWorkPackage, setProgressWorkPackage] = useState<string>('');
  const [progressMilestone, setProgressMilestone] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(75);
  const [progressStatus, setProgressStatus] = useState<string>('ON_TRACK');
  const [reportingDate, setReportingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [progressNotes, setProgressNotes] = useState<string>('');
  const [manpowerDepl, setManpowerDepl] = useState<string>('');
  const [hasBlocker, setHasBlocker] = useState<boolean>(false);
  const [blockerDesc, setBlockerDesc] = useState<string>('');
  const [reportedTo, setReportedTo] = useState<string>('');
  const [blockerImpact, setBlockerImpact] = useState<string>('');
  const [submittedBy, setSubmittedBy] = useState<string>('Site Execution Lead');
  const [savingProgress, setSavingProgress] = useState<boolean>(false);

  const loadContractors = () => {
    setLoading(true);
    ApiClient.getContractors()
      .then((data) => {
        // Enrich contractors with default work packages & milestones if not existing
        const enriched = data.map((c: any) => ({
          ...c,
          workPackages: c.workPackages || [
            {
              id: `wp-${c.id}-1`,
              title: `${c.scope || 'Civil Works'} - Tower A & B Execution`,
              value: c.metrics?.totalContractsValue || 25000000,
              startDate: '2025-06-01',
              endDate: '2026-12-31',
              milestones: [
                { id: 'm1', name: 'Substructure & Raft Foundation Clearance', targetDate: '2025-09-15', status: 'COMPLETED' },
                { id: 'm2', name: 'Superstructure RCC Slab Casting to 15th Floor', targetDate: '2026-04-30', status: 'IN_PROGRESS' },
                { id: 'm3', name: 'Masonry, Internal Plaster & Plumbing Rough-in', targetDate: '2026-08-31', status: 'PENDING' },
                { id: 'm4', name: 'Final Finishes, Testing & Snag Clearance Handover', targetDate: '2026-12-15', status: 'PENDING' },
              ],
            },
          ],
        }));
        setContractors(enriched);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadContractors();
  }, []);

  const openAssignModal = (contractor: any) => {
    setAssignModalContractor(contractor);
    setWorkPackageTitle(`${contractor.scope || 'Work Package'} - Phase 2 Scope`);
    setContractValue('15000000');
    const now = new Date().toISOString().split('T')[0];
    setStartDate(now);
    const inSixMonths = new Date();
    inSixMonths.setMonth(inSixMonths.getMonth() + 6);
    setEndDate(inSixMonths.toISOString().split('T')[0]);
    setMilestonesInput(
      'Milestone 1: Structural RCC Slab Casting (Target: 60 Days)\n' +
      'Milestone 2: Masonry & Electrical Conduit Rough-in (Target: 120 Days)\n' +
      'Milestone 3: Finishing, Snagging & Inspection Clearance (Target: 180 Days)'
    );
  };

  const handleSaveWorkPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalContractor) return;
    setSavingPackage(true);

    const parsedMilestones = milestonesInput
      .split('\n')
      .filter((line) => line.trim())
      .map((line, idx) => ({
        id: `m-new-${idx}`,
        name: line.trim(),
        targetDate: endDate,
        status: 'PENDING',
      }));

    const newPackage = {
      id: `wp-${Date.now()}`,
      title: workPackageTitle,
      value: Number(contractValue),
      startDate,
      endDate,
      milestones: parsedMilestones,
    };

    setContractors((prev) =>
      prev.map((c) =>
        c.id === assignModalContractor.id
          ? { ...c, workPackages: [...(c.workPackages || []), newPackage] }
          : c
      )
    );

    setFeedback(`Assigned work package "${workPackageTitle}" with ${parsedMilestones.length} milestones to ${assignModalContractor.name}.`);
    setAssignModalContractor(null);
    setSavingPackage(false);
  };

  const openProgressModal = (contractor: any) => {
    setProgressModalContractor(contractor);
    const defaultPackage = contractor.workPackages?.[0]?.title || `${contractor.scope || 'Civil Works'} Execution Scope`;
    const defaultMilestone = contractor.workPackages?.[0]?.milestones?.[1]?.name || contractor.workPackages?.[0]?.milestones?.[0]?.name || 'Superstructure & RCC Milestones';
    setProgressWorkPackage(defaultPackage);
    setProgressMilestone(defaultMilestone);
    setProgressPercent(contractor.latestProgressNote?.progressPercent || 75);
    setProgressStatus(contractor.latestProgressNote?.status || 'ON_TRACK');
    setReportingDate(new Date().toISOString().split('T')[0]);
    setProgressNotes(
      contractor.latestProgressNote?.progressNotes ||
      `Completed reinforcement binding and shuttering inspection. Concreting pour ready with slump test 120mm confirmed.`
    );
    setManpowerDepl(contractor.latestProgressNote?.manpowerDepl || '64 Pax, 2 Tower Cranes, 1 Placer Boom');
    setHasBlocker(false);
    setBlockerDesc('');
    setReportedTo('');
    setBlockerImpact('');
    setSubmittedBy('Site Execution Lead');
  };

  const handleSaveProgressNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressModalContractor) return;
    setSavingProgress(true);
    try {
      const payload = {
        workPackageTitle: progressWorkPackage,
        milestoneName: progressMilestone,
        progressPercent: Number(progressPercent),
        status: progressStatus,
        reportingDate,
        progressNotes,
        manpowerDepl,
        hasBlocker,
        blockerDesc: hasBlocker ? blockerDesc : undefined,
        reportedTo: hasBlocker ? reportedTo : undefined,
        blockerImpact: hasBlocker ? blockerImpact : undefined,
        submittedBy,
      };

      await ApiClient.addContractorProgressNote(progressModalContractor.id, payload);
      setFeedback(`✅ Progress report logged for ${progressModalContractor.name} and RAG-indexed! Senior executives can now query: "What is the project status for ${progressModalContractor.name}?" in Ask Project.`);
      setProgressModalContractor(null);
      loadContractors();
    } catch (err: any) {
      alert(err.message || 'Failed to save progress note');
    } finally {
      setSavingProgress(false);
    }
  };

  const formatINR = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Contractors Master & Work Package Milestones</h2>
            <p className="text-xs text-slate-400">
              Contractor profile directory, assigned work scopes, milestone schedules & dynamic scorecards
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Admin Mode: Work Package & Milestone Assignment Enabled</span>
          </div>
        )}
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Contractors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-400 text-xs">Loading contractor ratings...</div>
        ) : (
          contractors.map((c) => {
            const isExpanded = expandedContractorId === c.id;

            return (
              <div
                key={c.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-sm font-bold text-white leading-tight">{c.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-sky-400 font-bold">
                      {c.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{c.scope || 'General Construction Services'}</p>

                  {/* Performance Scorecard */}
                  <div className="mt-3.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Performance Score</div>
                      <div className="text-lg font-black text-amber-400 mt-0.5">
                        {c.metrics?.calculatedScore || c.performanceScore || 88} / 100
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Snag Resolution</div>
                      <div className="text-sm font-bold text-emerald-400 mt-0.5">
                        {c.metrics?.issueResolutionRate || 95}%
                      </div>
                    </div>
                  </div>

                  {/* Contact & Profile */}
                  <div className="mt-3 space-y-1 text-xs text-slate-400">
                    <div>Contact: <span className="text-slate-200">{c.contactPerson}</span> ({c.phone})</div>
                    <div>Email: <span className="text-slate-200">{c.email || 'contractor@domain.com'}</span></div>
                    <div>Active Work Packages: <span className="text-white font-semibold">{c.workPackages?.length || 1} Assigned</span></div>
                  </div>

                  {/* Latest Contractor Progress Report (RAG Enabled) */}
                  <div className="mt-3.5 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider">Progress Status</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1" title="Instantly queryable in Ask Project AI via RAG">
                          <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                          <span>RAG Indexed</span>
                        </span>
                        {c.latestProgressNote && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            c.latestProgressNote.status === 'COMPLETED'
                              ? 'bg-purple-500/20 text-purple-300'
                              : c.latestProgressNote.status === 'ON_TRACK'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : c.latestProgressNote.status === 'DELAYED'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {c.latestProgressNote.status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {c.latestProgressNote ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 font-medium truncate max-w-[190px]" title={c.latestProgressNote.milestoneName}>
                            {c.latestProgressNote.milestoneName || 'Milestone Execution'}
                          </span>
                          <span className="font-mono font-bold text-sky-400">{c.latestProgressNote.progressPercent}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              c.latestProgressNote.status === 'DELAYED'
                                ? 'bg-rose-500'
                                : c.latestProgressNote.status === 'COMPLETED'
                                ? 'bg-purple-500'
                                : 'bg-sky-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, c.latestProgressNote.progressPercent))}%` }}
                          />
                        </div>

                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                          "{c.latestProgressNote.progressNotes}"
                        </p>

                        {c.latestProgressNote.hasBlocker && (
                          <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/60 text-[10px] text-rose-300 flex items-start gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Blocker: </span>
                              <span>{c.latestProgressNote.blockerDesc}</span>
                              {c.latestProgressNote.reportedTo && (
                                <span className="text-slate-400 block mt-0.5">Escalated to: {c.latestProgressNote.reportedTo}</span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                          <span>Logged by {c.latestProgressNote.submittedBy || 'Site Lead'}</span>
                          <span>{new Date(c.latestProgressNote.reportingDate).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-dashed border-slate-800 text-[11px] text-slate-400 text-center">
                        No progress note logged yet. Click <span className="text-sky-400 font-semibold">"Log Progress"</span> below.
                      </div>
                    )}
                  </div>

                  {/* Assigned Work Packages & Milestones Section */}
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => setExpandedContractorId(isExpanded ? null : c.id)}
                      className="w-full flex items-center justify-between text-xs font-bold text-sky-400 hover:text-sky-300 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Work Packages & Milestones ({c.workPackages?.length || 0})</span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3">
                        {c.workPackages?.map((wp: any) => (
                          <div key={wp.id} className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs">{wp.title}</span>
                              <span className="font-mono text-emerald-400 font-semibold">{formatINR(wp.value)}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              <span>Target: {wp.startDate} → {wp.endDate}</span>
                            </div>

                            {/* Milestones list */}
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">Key Milestones</span>
                              {wp.milestones?.map((m: any) => (
                                <div key={m.id} className="flex items-start justify-between gap-2 p-1.5 rounded bg-slate-900 border border-slate-800/80">
                                  <div className="flex items-start gap-1.5 text-[11px] text-slate-300">
                                    <Clock className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                                    <span>{m.name}</span>
                                  </div>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    m.status === 'COMPLETED'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : m.status === 'IN_PROGRESS'
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {m.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                    {c.status || 'ACTIVE'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openProgressModal(c)}
                      className="px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                      title="Log progress notes and trigger automatic RAG indexing"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Log Progress (RAG)</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => openAssignModal(c)}
                        className="px-2 py-1 rounded bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Assign Scope</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Admin Assign Work Package Modal */}
      {assignModalContractor && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Assign Work Package & Milestones</h3>
                  <p className="text-[11px] text-slate-400">Contractor: {assignModalContractor.name}</p>
                </div>
              </div>
              <button
                onClick={() => setAssignModalContractor(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWorkPackage} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Work Package Scope Title *</label>
                <input
                  type="text"
                  required
                  value={workPackageTitle}
                  onChange={(e) => setWorkPackageTitle(e.target.value)}
                  placeholder="e.g. Tower C Structural RCC Frame & Slab Superstructure"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Total Contract Value (₹) *</label>
                <input
                  type="number"
                  required
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  placeholder="15000000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Commencement Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Handover Target Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Key Execution Milestones (Enter one milestone per line) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={milestonesInput}
                  onChange={(e) => setMilestonesInput(e.target.value)}
                  placeholder="Milestone 1: ...&#10;Milestone 2: ...&#10;Milestone 3: ..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-sky-500 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssignModalContractor(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPackage}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>{savingPackage ? 'Saving...' : 'Upload Work Assignment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Progress Note (RAG-Enabled) Modal */}
      {progressModalContractor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4 text-xs my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Log Contractor Progress Report</h3>
                  <p className="text-[11px] text-slate-400">
                    Contractor: <span className="text-white font-semibold">{progressModalContractor.name}</span> &bull; <span className="text-sky-400 font-mono">{progressModalContractor.code}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProgressModalContractor(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProgressNote} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-200 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-purple-300">RAG Vector Intelligence Enabled: </span>
                  Upon saving, this progress report will be automatically chunked and embedded into the vector database. Senior leadership can ask natural language questions in <strong>Ask Project</strong> (e.g. <em>"What is the project status for {progressModalContractor.name}?"</em>) and receive an instant, accurate briefing.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Work Package Scope *</label>
                  <input
                    type="text"
                    required
                    value={progressWorkPackage}
                    onChange={(e) => setProgressWorkPackage(e.target.value)}
                    placeholder="e.g. Superstructure RCC Frame"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Active Milestone Target *</label>
                  <input
                    type="text"
                    required
                    value={progressMilestone}
                    onChange={(e) => setProgressMilestone(e.target.value)}
                    placeholder="e.g. Milestone 2: 15th Floor Slab Casting"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Progress: <span className="font-mono text-purple-400 font-bold">{progressPercent}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progressPercent}
                    onChange={(e) => setProgressPercent(Number(e.target.value))}
                    className="w-full accent-purple-500 mt-2 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Execution Status *</label>
                  <select
                    value={progressStatus}
                    onChange={(e) => setProgressStatus(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="ON_TRACK">ON TRACK (Green)</option>
                    <option value="IN_PROGRESS">IN PROGRESS (Blue)</option>
                    <option value="DELAYED">DELAYED (Red)</option>
                    <option value="COMPLETED">COMPLETED (Purple)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Reporting Date *</label>
                  <input
                    type="date"
                    required
                    value={reportingDate}
                    onChange={(e) => setReportingDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Manpower & Machinery Deployed</label>
                <input
                  type="text"
                  value={manpowerDepl}
                  onChange={(e) => setManpowerDepl(e.target.value)}
                  placeholder="e.g. 74 Pax deployed, 2 Potain Cranes, 1 Concrete Placer Boom"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Detailed Progress Notes & EoD Achievements *</label>
                <textarea
                  rows={3}
                  required
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  placeholder="Describe specific work completed, tests performed, consultant approvals, rebar tied, slabs poured..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 leading-relaxed"
                />
              </div>

              {/* Site Blocker Checkbox */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasBlocker}
                    onChange={(e) => setHasBlocker(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-rose-500 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Report Critical Site Blocker / Delay Dependency</span>
                  </span>
                </label>

                {hasBlocker && (
                  <div className="space-y-2 pt-1 border-t border-slate-800/80 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-slate-400 text-[11px] font-semibold mb-1">Blocker Description *</label>
                      <input
                        type="text"
                        required={hasBlocker}
                        value={blockerDesc}
                        onChange={(e) => setBlockerDesc(e.target.value)}
                        placeholder="e.g. Awaiting architectural layout clearance for chiller pump room"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 text-[11px] font-semibold mb-1">Escalated To (Person)</label>
                        <input
                          type="text"
                          value={reportedTo}
                          onChange={(e) => setReportedTo(e.target.value)}
                          placeholder="e.g. Vikram Mehta (Chief Architect)"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[11px] font-semibold mb-1">Schedule Delay Impact</label>
                        <input
                          type="text"
                          value={blockerImpact}
                          onChange={(e) => setBlockerImpact(e.target.value)}
                          placeholder="e.g. 3-day hold on chiller manifold"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Reported / Submitted By *</label>
                <input
                  type="text"
                  required
                  value={submittedBy}
                  onChange={(e) => setSubmittedBy(e.target.value)}
                  placeholder="e.g. Rajesh Patil (Site Execution Lead)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setProgressModalContractor(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProgress}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{savingProgress ? 'Indexing with Vector RAG...' : 'Save & Enable RAG'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
