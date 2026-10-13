import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import { ShieldCheck } from 'lucide-react';
import { ComplianceSection } from '../components/ComplianceSection.js';

export const ComplianceView: React.FC<{ projectId?: string }> = ({ projectId }) => {
  const [summary, setSummary] = useState<any>(null);

  const loadSummary = async () => {
    try {
      const sum = await ApiClient.getComplianceSummary(projectId || undefined);
      setSummary(sum);
    } catch (e) {
      console.error('Failed to load compliance summary:', e);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [projectId]);

  return (
    <div className="space-y-5">
      {/* 1. Header Banner & Dynamic Scorecard */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Statutory & Regulatory Compliance Command</h2>
            <p className="text-xs text-slate-400">
              Clearance registry with interactive checklists, comments per item, document uploads & target closure dates
            </p>
          </div>
        </div>

        {summary && (
          <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Overall Score</div>
              <div className="text-base font-black text-emerald-400">
                {summary.compliancePercentage}%
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="text-right font-mono text-xs">
              <div className="text-emerald-400 font-bold">{summary.completed} Cleared</div>
              <div className="text-amber-400">{summary.inProgress} In-Progress</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Clearances Registry with Working Creation and Pop-up Checklist */}
      <ComplianceSection projectId={projectId} showCreateButton={true} />
    </div>
  );
};
