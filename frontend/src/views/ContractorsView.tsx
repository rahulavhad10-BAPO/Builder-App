import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import { HardHat } from 'lucide-react';

export const ContractorsView: React.FC = () => {
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    ApiClient.getContractors()
      .then(setContractors)
      .finally(() => setLoading(false));
  }, []);

  const formatINR = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Contractors Master & Performance Scorecard</h2>
            <p className="text-xs text-slate-400">Database-calculated ratings based on quality, safety, schedule & snag clearance</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-400 text-xs">Loading contractor ratings...</div>
        ) : (
          contractors.map((c) => (
            <div key={c.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white leading-tight">{c.name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-sky-400 font-bold">
                    {c.code}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{c.scope}</p>

                {/* Scorecard Metric Pill */}
                <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Performance Index</div>
                    <div className="text-lg font-black text-amber-400 mt-0.5">
                      {c.metrics?.calculatedScore || c.performanceScore} / 100
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Resolution Rate</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      {c.metrics?.issueResolutionRate || 100}%
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <div>Contact: <span className="text-slate-200">{c.contactPerson}</span> ({c.phone})</div>
                  <div>Active Contracts: <span className="text-white font-semibold">{c.metrics?.totalContracts || 0} Package(s)</span></div>
                  <div>Package Value: <span className="text-white font-semibold">{formatINR(c.metrics?.totalContractsValue || 0)}</span></div>
                  <div>Snags & Issues: <span className="text-white font-semibold">{c.metrics?.openIssues || 0} Open ({c.metrics?.resolvedIssues || 0} Resolved)</span></div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                  {c.status}
                </span>
                <span className="text-slate-400 text-[11px]">Safety: Zero LTI</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
