import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import { KpiCard } from '../components/KpiCard.js';
import {
  TrendingUp,
  AlertTriangle,
  Package,
  Building2,
  ShieldCheck,
  HardHat,
  IndianRupee,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface DashboardViewProps {
  projectId: string;
  onNavigate: (tab: string, filter?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ projectId, onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getDashboard(projectId);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Loading Command Center analytics...
      </div>
    );
  }

  if (!data) {
    return <div className="text-rose-400 p-6">Failed to load Command Center metrics.</div>;
  }

  const kpis = data.kpis;
  const formatINR = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* Top Project Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Live Operations Feed
            </span>
            <span className="text-xs text-slate-400">Database Synchronized</span>
          </div>
          <h2 className="text-xl font-extrabold text-white mt-1">
            {data.project?.name || 'All Active Development Projects'}
          </h2>
          <p className="text-xs text-slate-400">
            {data.project?.location || 'Multi-Project Command Stream'} • Target Completion:{' '}
            <span className="text-slate-200 font-semibold">
              {data.project?.targetDate ? new Date(data.project.targetDate).toLocaleDateString('en-IN') : '2026-2027'}
            </span>
          </p>
        </div>

        {/* Schedule & Safety Pill */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-right">
            <div className="text-[10px] text-slate-400 font-medium">Safety Adherence</div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{kpis.safetyRecord}</span>
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-right">
            <div className="text-[10px] text-slate-400 font-medium">Schedule Health</div>
            <div className="text-xs font-bold text-sky-400">
              {kpis.scheduleHealth} (Planned {kpis.plannedProgress}% vs Actual {kpis.projectProgress}%)
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: CRITICAL OPERATIONAL ALERTS (CLICKABLE DRILLDOWN) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <span>Priority Operational Exceptions</span>
          <span className="text-[10px] text-slate-500 font-normal">(Click any card to drill down into records)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Overdue Material Demands"
            value={`${kpis.overdueMaterialDemand} Demands`}
            subValue="Site delivery date elapsed"
            badge={kpis.overdueMaterialDemand > 0 ? 'Urgent Alert' : 'Normal'}
            badgeColor={kpis.overdueMaterialDemand > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}
            icon={Clock}
            iconColor="text-rose-400"
            alertLevel={kpis.overdueMaterialDemand > 0 ? 'critical' : 'normal'}
            drillDownLabel="View Overdue Demands"
            onClick={() => onNavigate('procurement', { tab: 'demands', status: 'OVERDUE' })}
          />

          <KpiCard
            title="PO Quantity Exceptions"
            value={`${kpis.poExceptionsCount} Mismatches`}
            subValue="Demand vs PO Quantity Anomaly"
            badge={kpis.poExceptionsCount > 0 ? 'Verification Alert' : 'Verified'}
            badgeColor={kpis.poExceptionsCount > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}
            icon={AlertTriangle}
            iconColor="text-amber-400"
            alertLevel={kpis.poExceptionsCount > 0 ? 'warning' : 'normal'}
            drillDownLabel="Open Exception Engine"
            onClick={() => onNavigate('procurement', { tab: 'exceptions' })}
          />

          <KpiCard
            title="Overdue Customer Demands"
            value={formatINR(kpis.overdueCustomerAmount)}
            subValue={`Across ${kpis.flatsWithOverdueDemands} Customer Units`}
            badge="Collection Risk"
            badgeColor="bg-rose-500/20 text-rose-300"
            icon={IndianRupee}
            iconColor="text-rose-400"
            alertLevel={kpis.overdueCustomerAmount > 0 ? 'critical' : 'normal'}
            drillDownLabel="Review Due Demands"
            onClick={() => onNavigate('flats', { paymentStatus: 'OVERDUE' })}
          />

          <KpiCard
            title="Critical Site Snags"
            value={`${kpis.criticalIssues} Critical`}
            subValue="Sourced from Site QA & Snag Registry"
            badge="QA / Snags"
            badgeColor="bg-blue-500/20 text-blue-300"
            icon={AlertTriangle}
            iconColor="text-blue-400"
            drillDownLabel="Open Snag Tracker"
            onClick={() => onNavigate('operations', { tab: 'issues', priority: 'CRITICAL' })}
          />
        </div>
      </div>

      {/* SECTION 2: COMMERCIAL & REAL ESTATE DOMAIN */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Real Estate Flat Inventory & Collections
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Flat Inventory Status"
            value={`${kpis.soldFlats} / ${kpis.totalFlats} Sold`}
            subValue={`${kpis.availableFlats} Units Available for Sale`}
            badge="Inventory"
            badgeColor="bg-sky-500/20 text-sky-300"
            icon={Building2}
            drillDownLabel="Open Flat Master"
            onClick={() => onNavigate('flats')}
          />

          <KpiCard
            title="Total Collection Value"
            value={formatINR(kpis.totalCollection)}
            subValue={`Agreement Book: ${formatINR(kpis.totalAgreementValue)}`}
            badge={`${kpis.collectionEfficiency}% Efficiency`}
            badgeColor="bg-emerald-500/20 text-emerald-300"
            icon={TrendingUp}
            iconColor="text-emerald-400"
            drillDownLabel="Collection Dashboard"
            onClick={() => onNavigate('crm')}
          />

          <KpiCard
            title="Upcoming Demand Amount"
            value={formatINR(kpis.upcomingDemandAmount)}
            subValue="Next Milestone Projections"
            badge="Forecast"
            badgeColor="bg-indigo-500/20 text-indigo-300"
            icon={Clock}
            iconColor="text-indigo-400"
            drillDownLabel="View Milestone Demands"
            onClick={() => onNavigate('flats')}
          />

          <KpiCard
            title="Total Receivables Outstanding"
            value={formatINR(kpis.totalOutstanding)}
            subValue="Contractual Balance Remaining"
            badge="Receivables"
            badgeColor="bg-slate-700 text-slate-300"
            icon={IndianRupee}
            drillDownLabel="Customer CRM Ledger"
            onClick={() => onNavigate('crm')}
          />
        </div>
      </div>

      {/* SECTION 3: ENGINEERING, COMPLIANCE & PROCUREMENT */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Engineering, Statutory Compliance & Procurement
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Statutory Compliance Score"
            value={`${kpis.compliancePercentage}%`}
            subValue={`${kpis.complianceCompleted} of ${kpis.complianceTotal} Statutory Approvals Active`}
            badge={kpis.compliancePercentage >= 75 ? 'RERA Approved' : 'Action Required'}
            badgeColor={kpis.compliancePercentage >= 75 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}
            icon={ShieldCheck}
            iconColor="text-emerald-400"
            drillDownLabel="Open Compliance Tracker"
            onClick={() => onNavigate('compliance')}
          />

          <KpiCard
            title="Contractor Performance Score"
            value={`${kpis.avgContractorScore} / 100`}
            subValue={`${kpis.activeContractorsCount} Active Primary Contractors`}
            badge="Scorecard"
            badgeColor="bg-sky-500/20 text-sky-300"
            icon={HardHat}
            iconColor="text-amber-400"
            drillDownLabel="Contractor Directory"
            onClick={() => onNavigate('contractors')}
          />

          <KpiCard
            title="Procurement & Open POs"
            value={`${kpis.openPOs} Active POs`}
            subValue={`${kpis.pendingMaterialDemand} Demands Pending Issue`}
            badge="Procurement"
            badgeColor="bg-purple-500/20 text-purple-300"
            icon={Package}
            drillDownLabel="Procurement Manager"
            onClick={() => onNavigate('procurement')}
          />

          <KpiCard
            title="Inventory & Low Stock Items"
            value={`${kpis.lowStockCount} Low Stock`}
            subValue={`Out of ${kpis.totalInventoryCount} cataloged materials`}
            badge={kpis.lowStockCount > 0 ? 'Reorder Alert' : 'Stock Optimal'}
            badgeColor={kpis.lowStockCount > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}
            icon={Package}
            iconColor="text-sky-400"
            drillDownLabel="Inventory Balances"
            onClick={() => onNavigate('material-inventory', { lowStock: true })}
          />
        </div>
      </div>
    </div>
  );
};
