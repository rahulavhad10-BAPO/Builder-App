import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import {
  ClipboardList,
  Calendar,
} from 'lucide-react';

interface OperationsViewProps {
  projectId: string;
  initialFilters?: any;
}

export const OperationsView: React.FC<OperationsViewProps> = ({ projectId, initialFilters }) => {
  const [activeTab, setActiveTab] = useState<'issues' | 'daily' | 'monthly' | 'meetings'>(
    initialFilters?.tab || 'issues'
  );
  const [issues, setIssues] = useState<any[]>([]);
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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
      setIssues(iRes);
      setDailyReports(dRes);
      setMonthlyReports(mRes);
      setMeetings(meetRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialFilters?.tab) setActiveTab(initialFilters.tab);
  }, [initialFilters]);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleResolveIssue = async (id: string) => {
    try {
      await ApiClient.updateIssueStatus(id, { status: 'RESOLVED', resolution: 'Inspected and certified by Site Engineer.' });
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Error resolving issue');
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
            <h2 className="text-base font-bold text-white">Site Operations & Quality Assurance</h2>
            <p className="text-xs text-slate-400">Issues, Snags, RFIs, Daily manpower logs, and Minutes of Meetings</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'issues' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Issues / Snags / RFIs ({issues.length})
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'daily' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Daily Reports ({dailyReports.length})
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
            onClick={() => setActiveTab('meetings')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'meetings' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            MOM & Actions ({meetings.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading operational records...</div>
      ) : (
        <>
          {/* TAB 1: ISSUES / SNAGS / RFIS */}
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
                        <td className="p-3 text-slate-300">{i.contractor?.name || 'General Contractor'}</td>
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

          {/* TAB 2: DAILY REPORTS */}
          {activeTab === 'daily' && (
            <div className="space-y-3">
              {dailyReports.map((dr) => (
                <div key={dr.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-400" />
                      <span className="font-bold text-white text-sm">
                        Site DPR - {new Date(dr.date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">Weather: <b className="text-white">{dr.weather}</b></span>
                      <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 font-bold border border-sky-800">
                        Manpower: {dr.manpower} Pax
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <div>
                      <div className="text-slate-400 font-semibold">Planned Work:</div>
                      <div className="text-slate-200 mt-0.5">{dr.plannedWork}</div>
                    </div>
                    <div>
                      <div className="text-emerald-400 font-semibold">Completed Work:</div>
                      <div className="text-slate-200 mt-0.5">{dr.completedWork}</div>
                    </div>
                  </div>
                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60">
                    <span>Safety Adherence: <b className="text-emerald-400">{dr.safety}</b></span>
                    <span>Submitted by: {dr.submittedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: MONTHLY REPORTS */}
          {activeTab === 'monthly' && (
            <div className="space-y-3">
              {monthlyReports.map((mr) => (
                <div key={mr.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">
                      Monthly Progress Audit: Month {mr.month}/{mr.year}
                    </h3>
                    <div className="flex items-center gap-3 font-semibold">
                      <span className="text-slate-400">Planned: {mr.plannedProgress}%</span>
                      <span className="text-sky-400">Actual: {mr.actualProgress}%</span>
                      <span className={mr.variance < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        Variance: {mr.variance}%
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300">
                    <div className="font-semibold text-white mb-1">Key Achievements:</div>
                    <p>{mr.achievements}</p>
                    <div className="font-semibold text-white mt-2 mb-1">Next Month Priorities:</div>
                    <p>{mr.nextMonthPriorities}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: MEETINGS & ACTIONS */}
          {activeTab === 'meetings' && (
            <div className="space-y-4">
              {meetings.map((m) => (
                <div key={m.id} className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{m.title}</h3>
                      <div className="text-slate-400 text-[11px]">
                        {new Date(m.date).toLocaleDateString('en-IN')} • {m.location}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                      {m.status}
                    </span>
                  </div>

                  <div>
                    <div className="text-slate-400 font-semibold">Participants:</div>
                    <div className="text-slate-300">{m.participants}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                    <div className="text-slate-400 font-semibold mb-1">Decisions Made:</div>
                    <ul className="list-disc list-inside text-slate-200 space-y-0.5">
                      {m.decisions?.map((d: any) => (
                        <li key={d.id}>{d.decision} (by {d.decidedBy})</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="text-slate-400 font-semibold mb-1">Action Items:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {m.actions?.map((a: any) => (
                        <div key={a.id} className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-white">{a.title}</div>
                            <div className="text-[10px] text-slate-400">Owner: {a.ownerName} • Due: {new Date(a.dueDate).toLocaleDateString('en-IN')}</div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-700 text-slate-300">
                            {a.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
