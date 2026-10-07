import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import { ShieldCheck } from 'lucide-react';

interface ComplianceViewProps {
  projectId: string;
}

export const ComplianceView: React.FC<ComplianceViewProps> = ({ projectId }) => {
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await ApiClient.updateComplianceItem(id, { status: newStatus });
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to update compliance item');
    } finally {
      setUpdatingId(null);
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
            <h2 className="text-base font-bold text-white">Statutory & Regulatory Compliance</h2>
            <p className="text-xs text-slate-400">
              RERA, Fire NOC, Environmental Clearances, Labour Welfare & Municipal bylaws
            </p>
          </div>
        </div>

        {summary && (
          <div className="flex items-center gap-4 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Dynamic Compliance Rate</div>
              <div className="text-lg font-black text-emerald-400">
                {summary.compliancePercentage}%
              </div>
              <div className="text-[10px] text-slate-500">
                {summary.completed} of {summary.totalApplicable} applicable items completed
              </div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 flex items-center justify-center font-bold text-xs text-white">
              {summary.compliancePercentage}%
            </div>
          </div>
        )}
      </div>

      {/* Checklist Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Statutory Clearance / License</th>
                <th className="p-3">Category</th>
                <th className="p-3">Assigned Owner</th>
                <th className="p-3">Due Date</th>
                <th className="p-3">Verification Remarks</th>
                <th className="p-3">Status (Dynamic % Update)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Loading statutory checklist...</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="p-3">
                      <div className="font-bold text-white">{item.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.description}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {item.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 font-medium">{item.ownerName}</td>
                    <td className="p-3 text-slate-400">{new Date(item.dueDate).toLocaleDateString('en-IN')}</td>
                    <td className="p-3 text-slate-300 max-w-xs">{item.remarks || 'No remarks entered'}</td>
                    <td className="p-3">
                      <select
                        disabled={updatingId === item.id}
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold border focus:outline-none cursor-pointer transition-colors ${
                          item.status === 'COMPLETED'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                            : item.status === 'IN_PROGRESS'
                            ? 'bg-sky-950/60 text-sky-300 border-sky-800'
                            : item.status === 'NOT_APPLICABLE'
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : item.status === 'OVERDUE'
                            ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                            : 'bg-amber-950/60 text-amber-300 border-amber-800'
                        }`}
                      >
                        <option value="COMPLETED">Completed</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="PENDING">Pending</option>
                        <option value="OVERDUE">Overdue</option>
                        <option value="NOT_APPLICABLE">Not Applicable (Excluded from %)</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
