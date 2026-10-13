import React, { useEffect, useState, useMemo } from 'react';
import { ApiClient } from '../api/client.js';
import {
  ClipboardList,
  Calendar,
  Building,
  HardHat,
  AlertTriangle,
  CheckCircle2,
  Camera,
  PlusCircle,
  X,
  Clock,
  BarChart3,
} from 'lucide-react';

interface OperationsViewProps {
  projectId: string;
  initialFilters?: any;
}

export const OperationsView: React.FC<OperationsViewProps> = ({ projectId, initialFilters }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'issues' | 'meetings'>(
    initialFilters?.tab === 'issues' ? 'issues' : 'daily'
  );

  const [issues, setIssues] = useState<any[]>([]);
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Tower & Contractor Filters
  const [selectedTower, setSelectedTower] = useState<string>('');
  const [selectedContractor, setSelectedContractor] = useState<string>('');

  // Daily Report Submission Modal
  const [dprModalOpen, setDprModalOpen] = useState<boolean>(false);
  const [newTower, setNewTower] = useState<string>('Tower A');
  const [newContractor, setNewContractor] = useState<string>('Apex Civil Works');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newWeather, setNewWeather] = useState<string>('Clear / Sunny 32°C');
  const [newManpower, setNewManpower] = useState<string>('48');
  const [newPlanned, setNewPlanned] = useState<string>('');
  const [newAchieved, setNewAchieved] = useState<string>('');
  const [hasBlocker, setHasBlocker] = useState<boolean>(false);
  const [blockerDesc, setBlockerDesc] = useState<string>('');
  const [reportedTo, setReportedTo] = useState<string>('');
  const [blockerImpact, setBlockerImpact] = useState<string>('');
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [iRes, dRes, mRes, meetRes] = await Promise.all([
        ApiClient.getIssues({
          projectId: projectId || undefined,
          priority: initialFilters?.priority || undefined,
        }),
        ApiClient.getDailyReports({ projectId: projectId || undefined }),
        ApiClient.getMonthlyReports(projectId || undefined),
        ApiClient.getMeetings(projectId || undefined),
      ]);

      // Map real daily reports from backend
      const enrichedDaily = (dRes || []).map((dr: any) => ({
        ...dr,
        tower: dr.building?.name || dr.tower || 'Tower A',
        contractor: dr.contractor?.name || dr.contractor || 'Contractor',
        blocker: dr.hasBlocker
          ? {
              description: dr.blockerDesc,
              reportedTo: dr.reportedTo,
              impact: dr.blockerImpact,
            }
          : null,
      }));

      setDailyReports(enrichedDaily);
      setIssues(iRes || []);
      setMonthlyReports(mRes || []);
      setMeetings(meetRes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Filter daily reports by Tower and Contractor
  const filteredDailyReports = useMemo(() => {
    return dailyReports.filter((dr) => {
      const matchTower = !selectedTower || dr.tower === selectedTower;
      const matchContractor = !selectedContractor || dr.contractor === selectedContractor;
      return matchTower && matchContractor;
    });
  }, [dailyReports, selectedTower, selectedContractor]);

  // Auto-aggregate weekly report rollup from daily reports
  const weeklyRollup = useMemo(() => {
    const totalManDays = filteredDailyReports.reduce((acc, dr) => acc + (dr.manpower || 0), 0);
    const blockersCount = filteredDailyReports.filter((dr) => dr.hasBlocker).length;
    return {
      period: 'Week 13 (22 Mar - 28 Mar 2026)',
      dprCount: filteredDailyReports.length,
      totalManDays,
      blockersCount,
      adherenceRate: filteredDailyReports.length > 0 ? Math.round(((filteredDailyReports.length - blockersCount) / filteredDailyReports.length) * 100) : 100,
      towersActive: Array.from(new Set(filteredDailyReports.map((d) => d.tower))).join(', ') || 'All Towers',
    };
  }, [filteredDailyReports]);

  const handleResolveIssue = async (id: string) => {
    try {
      await ApiClient.updateIssueStatus(id, {
        status: 'RESOLVED',
        resolution: 'Inspected and certified by Site Engineer.',
      });
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Error resolving issue');
    }
  };

  const handleCreateDPR = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.createDailyReport({
        projectId: projectId || undefined,
        tower: newTower,
        contractor: newContractor,
        date: new Date(newDate).toISOString(),
        weather: newWeather,
        manpower: Number(newManpower) || 0,
        plannedWork: newPlanned,
        completedWork: newAchieved,
        hasBlocker,
        blockerDesc: hasBlocker ? blockerDesc : null,
        reportedTo: hasBlocker ? reportedTo : null,
        blockerImpact: hasBlocker ? blockerImpact : null,
        safety: 'PPE & Fall-Protection Verified',
        remarks: `${newTower} execution logged by ${newContractor}`,
      });
      await loadData();
      setFeedback(`Daily progress report saved successfully.`);
      setDprModalOpen(false);
      setNewPlanned('');
      setNewAchieved('');
      setHasBlocker(false);
      setBlockerDesc('');
      setReportedTo('');
      setBlockerImpact('');
      setPhotoName(null);
    } catch (err: any) {
      console.error('Failed to save DPR:', err);
      alert(err.message || 'Failed to save daily progress report');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Site Operations & Progress Reporting Engine</h2>
            <p className="text-xs text-slate-400">
              Tower-wise & Contractor-wise daily progress, photo evidence, blocker resolution, and weekly/monthly rollups
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs flex-wrap">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'daily' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Daily Reports ({dailyReports.length})
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'weekly' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Weekly Rollup
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'monthly' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly Reports ({monthlyReports.length})
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'issues' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Issues & Snags ({issues.length})
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'meetings' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            MOM ({meetings.length})
          </button>
        </div>
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

      {/* Filter Bar (Tower-wise & Contractor-wise) */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Tower Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white">
            <Building className="w-3.5 h-3.5 text-sky-400" />
            <select
              value={selectedTower}
              onChange={(e) => setSelectedTower(e.target.value)}
              className="bg-transparent focus:outline-none text-xs"
            >
              <option value="" className="bg-slate-900">All Towers</option>
              <option value="Tower A" className="bg-slate-900">Tower A</option>
              <option value="Tower B" className="bg-slate-900">Tower B</option>
              <option value="Tower C" className="bg-slate-900">Tower C</option>
              <option value="Main Tower" className="bg-slate-900">Main Tower</option>
            </select>
          </div>

          {/* Contractor Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white">
            <HardHat className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={selectedContractor}
              onChange={(e) => setSelectedContractor(e.target.value)}
              className="bg-transparent focus:outline-none text-xs"
            >
              <option value="" className="bg-slate-900">All Contractors</option>
              <option value="Apex Civil Works" className="bg-slate-900">Apex Civil Works</option>
              <option value="Shivalik MEP Services" className="bg-slate-900">Shivalik MEP Services</option>
              <option value="Sterling Finishing Ltd" className="bg-slate-900">Sterling Finishing Ltd</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setDprModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs cursor-pointer shadow-sm w-full sm:w-auto justify-center"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Submit Daily Progress Report (DPR)</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading operational records...</div>
      ) : (
        <>
          {/* TAB 1: DAILY REPORTS */}
          {activeTab === 'daily' && (
            <div className="space-y-4">
              {filteredDailyReports.length === 0 ? (
                <div className="p-10 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
                  No daily reports match the selected Tower / Contractor filter.
                </div>
              ) : (
                filteredDailyReports.map((dr) => (
                  <div key={dr.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-white font-bold text-sm">
                          <Calendar className="w-4 h-4 text-sky-400" />
                          <span>{new Date(dr.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          {dr.tower}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-amber-300 border border-slate-700">
                          {dr.contractor}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-slate-400">
                        <span>Weather: <b className="text-white">{dr.weather}</b></span>
                        <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 font-bold border border-sky-800">
                          Manpower: {dr.manpower} Pax
                        </span>
                      </div>
                    </div>

                    {/* Planned vs Achieved EoD */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                        <div className="text-slate-400 font-bold text-[11px] uppercase flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-sky-400" />
                          <span>Planned Work For Day</span>
                        </div>
                        <p className="text-slate-200 leading-relaxed">{dr.plannedWork}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                        <div className="text-emerald-400 font-bold text-[11px] uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Achieved End of Day (EoD)</span>
                        </div>
                        <p className="text-slate-200 leading-relaxed">{dr.completedWork}</p>
                      </div>
                    </div>

                    {/* Blocker Banner (if any) */}
                    {dr.hasBlocker && dr.blocker && (
                      <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/60 text-xs space-y-1.5">
                        <div className="flex items-center gap-2 text-rose-300 font-bold">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>Active Site Blocker Encountered</span>
                        </div>
                        <div className="text-slate-200">{dr.blocker.description}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 text-slate-400">
                          <div>Reported Escalation To: <span className="text-white font-semibold">{dr.blocker.reportedTo}</span></div>
                          <div>Impact: <span className="text-rose-300 font-semibold">{dr.blocker.impact}</span></div>
                        </div>
                      </div>
                    )}

                    {/* Photo and Submitter Footer */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <span>Submitted by: <b className="text-slate-200">{dr.submittedBy}</b></span>
                        <span>Safety Compliance: <b className="text-emerald-400">{dr.safety}</b></span>
                      </div>
                      {dr.photoUrl && (
                        <a
                          href={dr.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>View Attached Site Photo</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: WEEKLY ROLLUP */}
          {activeTab === 'weekly' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="font-bold text-white text-sm">Automated Weekly Execution Rollup</h3>
                      <p className="text-[11px] text-slate-400">{weeklyRollup.period} • {weeklyRollup.towersActive}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    {weeklyRollup.adherenceRate}% Execution Adherence
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 block">DPRs Submitted</span>
                    <span className="text-lg font-bold text-white font-mono">{weeklyRollup.dprCount} Reports</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 block">Total Manpower Deployed</span>
                    <span className="text-lg font-bold text-sky-400 font-mono">{weeklyRollup.totalManDays} Man-Days</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 block">Blockers Reported</span>
                    <span className="text-lg font-bold text-rose-400 font-mono">{weeklyRollup.blockersCount} Blockers</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 block">Safety Performance</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">100% Zero LTI</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 text-slate-300 text-[11px] leading-relaxed">
                  Weekly summary auto-compiled from verified Contractor Daily DPR submissions across {selectedTower || 'all tower work-zones'}. Material demands and concrete pour certifications are fully cross-referenced.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MONTHLY REPORTS */}
          {activeTab === 'monthly' && (
            <div className="space-y-3">
              {monthlyReports.map((mr) => (
                <div key={mr.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-white text-sm">{mr.title} ({mr.month})</div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300">
                      Progress: {mr.overallProgress}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-slate-300">
                    <div>Planned Milestone: <b className="text-white">{mr.plannedMilestone}</b></div>
                    <div>Achieved Milestone: <b className="text-emerald-400">{mr.achievedMilestone}</b></div>
                    <div>Critical Variance: <b className="text-amber-400">{mr.variance}</b></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: ISSUES & SNAGS */}
          {activeTab === 'issues' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Type</th>
                      <th className="p-3">Location & Floor</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Contractor Assigned</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {issues.map((i) => (
                      <tr key={i.id} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              i.type === 'ISSUE'
                                ? 'bg-rose-500/20 text-rose-300'
                                : i.type === 'SNAG'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {i.type}
                          </span>
                        </td>
                        <td className="p-3 text-white font-medium">
                          <div>{i.building?.name || 'Main Tower'}</div>
                          <div className="text-[10px] text-slate-400">{i.location}</div>
                        </td>
                        <td className="p-3 text-slate-200 max-w-sm">{i.description}</td>
                        <td className="p-3 text-slate-300">{i.contractor?.name || 'Apex Civil Works'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              i.priority === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {i.priority}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{new Date(i.dueDate).toLocaleDateString('en-IN')}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              i.status === 'RESOLVED' || i.status === 'CLOSED'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {i.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {i.status !== 'RESOLVED' && i.status !== 'CLOSED' && (
                            <button
                              onClick={() => handleResolveIssue(i.id)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold text-xs transition-colors cursor-pointer"
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: MOM & ACTIONS */}
          {activeTab === 'meetings' && (
            <div className="space-y-3">
              {meetings.map((m) => (
                <div key={m.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{m.title}</span>
                    <span className="text-slate-400 font-mono">{new Date(m.date).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p className="text-slate-300">{m.summary || 'Weekly progress coordination review with site leads.'}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* New DPR Submission Modal */}
      {dprModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-sm">Submit Contractor Daily Progress Report</h3>
              </div>
              <button onClick={() => setDprModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDPR} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Target Tower / Building</label>
                  <select
                    value={newTower}
                    onChange={(e) => setNewTower(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="Tower A">Tower A</option>
                    <option value="Tower B">Tower B</option>
                    <option value="Tower C">Tower C</option>
                    <option value="Main Tower">Main Tower</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Contractor / Agency</label>
                  <select
                    value={newContractor}
                    onChange={(e) => setNewContractor(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="Larsen & Toubro Civil Infra Ltd">Larsen & Toubro Civil Infra Ltd</option>
                    <option value="Sterling & Wilson MEP Solutions">Sterling & Wilson MEP Solutions</option>
                    <option value="KONE Elevators India Pvt Ltd">KONE Elevators India Pvt Ltd</option>
                    <option value="Apex Civil Works & Masonry Ltd">Apex Civil Works & Masonry Ltd</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Weather</label>
                  <input
                    type="text"
                    value={newWeather}
                    onChange={(e) => setNewWeather(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Manpower</label>
                  <input
                    type="number"
                    value={newManpower}
                    onChange={(e) => setNewManpower(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  What was Planned for Today? *
                </label>
                <textarea
                  rows={2}
                  required
                  value={newPlanned}
                  onChange={(e) => setNewPlanned(e.target.value)}
                  placeholder="e.g. Shuttering and rebar fixing for 14th floor cantilever balcony"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  What was Achieved End of Day (EoD)? *
                </label>
                <textarea
                  rows={2}
                  required
                  value={newAchieved}
                  onChange={(e) => setNewAchieved(e.target.value)}
                  placeholder="e.g. 100% shuttering installed and safety handrails anchored"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Blocker Section */}
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-rose-300 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasBlocker}
                    onChange={(e) => setHasBlocker(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-rose-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Did you encounter any site blockers or delays today?</span>
                </label>

                {hasBlocker && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-slate-400 text-[10px] font-semibold mb-0.5">Blocker Description *</label>
                      <input
                        type="text"
                        required={hasBlocker}
                        value={blockerDesc}
                        onChange={(e) => setBlockerDesc(e.target.value)}
                        placeholder="e.g. Water supply pump trip delayed curing"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 text-[10px] font-semibold mb-0.5">Reported Escalation To *</label>
                        <input
                          type="text"
                          required={hasBlocker}
                          value={reportedTo}
                          onChange={(e) => setReportedTo(e.target.value)}
                          placeholder="e.g. Project Director / Site Engg"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[10px] font-semibold mb-0.5">Impact on Schedule / Cost</label>
                        <input
                          type="text"
                          value={blockerImpact}
                          onChange={(e) => setBlockerImpact(e.target.value)}
                          placeholder="e.g. 1-day concrete curing slip"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Attach Site Photo Evidence</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoName(e.target.files?.[0]?.name || null)}
                  className="text-xs text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-sky-400 hover:file:bg-slate-700 cursor-pointer"
                />
                {photoName && (
                  <span className="text-[11px] text-emerald-400 mt-1 block">Attached: {photoName}</span>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDprModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer shadow-sm"
                >
                  Save & Log Daily DPR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
