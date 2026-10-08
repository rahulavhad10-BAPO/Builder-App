import React, { useEffect, useState, useMemo } from 'react';
import { ApiClient } from '../api/client.js';
import {
  Briefcase,
  Building,
  CheckCircle2,
  Clock,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  LayoutList,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

interface BrokersViewProps {
  projectId?: string;
  onOpenFlat360?: (flatId: string) => void;
}

export const BrokersView: React.FC<BrokersViewProps> = ({ projectId, onOpenFlat360 }) => {
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [expandedAgencies, setExpandedAgencies] = useState<Record<string, boolean>>({});

  const loadBrokers = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getBrokers();
      setBrokers(data);
      // Expand all agencies by default for immediate visibility
      const initExpanded: Record<string, boolean> = {};
      data.forEach((b: any) => {
        initExpanded[b.id] = true;
      });
      setExpandedAgencies(initExpanded);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrokers();
  }, [projectId]);

  const toggleAgencyExpand = (id: string) => {
    setExpandedAgencies(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatINR = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  // Filtered Brokers
  const filteredBrokers = useMemo(() => {
    if (!search.trim()) return brokers;
    const term = search.toLowerCase();
    return brokers.filter((b) => {
      const matchesAgency = b.name.toLowerCase().includes(term) || (b.company && b.company.toLowerCase().includes(term));
      const matchesUnits = b.soldUnits?.some((u: any) =>
        u.unitNumber.toLowerCase().includes(term) ||
        u.project.toLowerCase().includes(term) ||
        u.customerName.toLowerCase().includes(term) ||
        u.tower.toLowerCase().includes(term)
      );
      return matchesAgency || matchesUnits;
    });
  }, [brokers, search]);

  // Aggregate Top Metrics
  const summaryMetrics = useMemo(() => {
    const totalAgencies = brokers.length;
    const totalUnitsSold = brokers.reduce((acc, b) => acc + (b.soldUnits?.length || b.metrics?.totalBookings || 0), 0);
    const totalVolume = brokers.reduce((acc, b) => acc + (b.metrics?.totalBookingValue || 0), 0);
    const totalCommission = brokers.reduce((acc, b) => acc + (b.metrics?.totalCommission || 0), 0);
    const totalPaid = brokers.reduce((acc, b) => acc + (b.metrics?.paidCommission || 0), 0);
    const totalPending = Math.max(0, totalCommission - totalPaid);

    return {
      totalAgencies,
      totalUnitsSold,
      totalVolume,
      totalCommission,
      totalPaid,
      totalPending,
    };
  }, [brokers]);

  // Flattened units list for tabular view mode
  const allSoldUnits = useMemo(() => {
    const units: any[] = [];
    filteredBrokers.forEach((b) => {
      if (b.soldUnits && b.soldUnits.length > 0) {
        b.soldUnits.forEach((u: any) => {
          units.push({
            ...u,
            brokerId: b.id,
            brokerName: b.name,
            brokerCompany: b.company || b.name,
            registrationNo: b.registrationNo || 'RERA Verified',
            commissionRate: b.commissionRate,
          });
        });
      }
    });
    return units;
  }, [filteredBrokers]);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Brokers & Channel Partners Registry</h2>
            <p className="text-xs text-slate-400">
              RERA channel partner network, unit sales origination, brokerage commissions & disbursal ledger
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('grouped')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              viewMode === 'grouped' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Grouped by Broker House</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              viewMode === 'list' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>Consolidated Unit List</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>Channel Partners</span>
          </div>
          <div className="text-lg font-bold text-white mt-1 font-mono">{summaryMetrics.totalAgencies}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Active Broker Houses</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-amber-400" />
            <span>Units Sourced</span>
          </div>
          <div className="text-lg font-bold text-amber-300 mt-1 font-mono">{summaryMetrics.totalUnitsSold}</div>
          <div className="text-[10px] text-amber-500/80 mt-0.5">Flats Sold via Network</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
            <span>Gross Sales Volume</span>
          </div>
          <div className="text-lg font-bold text-indigo-300 mt-1">{formatINR(summaryMetrics.totalVolume)}</div>
          <div className="text-[10px] text-indigo-400/80 mt-0.5">Total Agreement Value</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-sky-400" />
            <span>Total Brokerage</span>
          </div>
          <div className="text-lg font-bold text-sky-300 mt-1">{formatINR(summaryMetrics.totalCommission)}</div>
          <div className="text-[10px] text-sky-400/80 mt-0.5">Commission Accrued</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-emerald-900/40">
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Brokerage Paid</span>
          </div>
          <div className="text-lg font-bold text-emerald-300 mt-1">{formatINR(summaryMetrics.totalPaid)}</div>
          <div className="text-[10px] text-emerald-500 mt-0.5">Disbursed to Date</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-rose-900/40">
          <div className="text-[11px] text-rose-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            <span>Balance Disbursal</span>
          </div>
          <div className="text-lg font-bold text-rose-300 mt-1">{formatINR(summaryMetrics.totalPending)}</div>
          <div className="text-[10px] text-rose-400 mt-0.5">Pending Clearance</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs">
        <Search className="w-4 h-4 text-slate-500 shrink-0 ml-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Brokerage House, Flat No, Tower, Project or Buyer Customer..."
          className="w-full bg-transparent border-0 text-white placeholder-slate-500 focus:outline-none text-xs"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-400 hover:text-white px-2 cursor-pointer">
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading Channel Partners register...</div>
      ) : (
        <>
          {/* VIEW MODE 1: GROUPED BY BROKERAGE HOUSE (Eliminates repeated names on UI) */}
          {viewMode === 'grouped' && (
            <div className="space-y-4">
              {filteredBrokers.length === 0 ? (
                <div className="p-10 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
                  No channel partners match the query.
                </div>
              ) : (
                filteredBrokers.map((b) => {
                  const isExpanded = !!expandedAgencies[b.id];
                  const units = b.soldUnits || [];

                  return (
                    <div
                      key={b.id}
                      className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm transition-all"
                    >
                      {/* Brokerage House Header Summary */}
                      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">
                            {b.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">{b.company || b.name}</h3>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-sky-400 font-semibold border border-slate-700">
                                {b.registrationNo || 'RERA VERIFIED'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                              <span>Point of Contact: <b className="text-slate-200">{b.name}</b></span>
                              <span>•</span>
                              <span>Phone: <b className="text-slate-200">{b.contact}</b></span>
                              {b.email && (
                                <>
                                  <span>•</span>
                                  <span>Email: <b className="text-slate-200">{b.email}</b></span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Agency Performance Badge & Toggle */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Sourced Volume</div>
                            <div className="text-sm font-bold text-indigo-300 font-mono">
                              {formatINR(b.metrics?.totalBookingValue || 0)}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[10px] text-emerald-400 uppercase font-semibold">Commission ({b.commissionRate}%)</div>
                            <div className="text-sm font-bold text-emerald-300 font-mono">
                              {formatINR(b.metrics?.totalCommission || 0)}
                            </div>
                          </div>

                          <button
                            onClick={() => toggleAgencyExpand(b.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors"
                          >
                            <span>{units.length} Unit(s)</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Units Sold by this Brokerage House */}
                      {isExpanded && (
                        <div className="p-4">
                          {units.length === 0 ? (
                            <div className="py-6 text-center text-slate-500 text-xs italic">
                              No property units currently booked through this partner.
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                                  <tr>
                                    <th className="p-2.5">Flat No.</th>
                                    <th className="p-2.5">Project</th>
                                    <th className="p-2.5">Tower</th>
                                    <th className="p-2.5">Booking Date</th>
                                    <th className="p-2.5">Buyer Name</th>
                                    <th className="p-2.5 text-right">Unit Amount (₹)</th>
                                    <th className="p-2.5 text-center">Brokerage %</th>
                                    <th className="p-2.5 text-right">Total Brokerage (₹)</th>
                                    <th className="p-2.5 text-right">Amount Paid (₹)</th>
                                    <th className="p-2.5 text-right">Balance Due (₹)</th>
                                    <th className="p-2.5 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                                  {units.map((u: any) => {
                                    const isPaid = u.balanceBrokerage <= 0 && u.totalBrokerage > 0;

                                    return (
                                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="p-2.5 font-bold font-mono text-sky-400">
                                          {onOpenFlat360 ? (
                                            <button
                                              onClick={() => onOpenFlat360(u.id)}
                                              className="hover:underline cursor-pointer"
                                            >
                                              {u.unitNumber}
                                            </button>
                                          ) : (
                                            u.unitNumber
                                          )}
                                        </td>
                                        <td className="p-2.5 text-white font-medium">{u.project}</td>
                                        <td className="p-2.5 text-slate-300">{u.tower}</td>
                                        <td className="p-2.5 text-slate-400 font-mono text-[11px]">{u.saleDate}</td>
                                        <td className="p-2.5 text-slate-200">{u.customerName}</td>
                                        <td className="p-2.5 text-right font-bold text-white font-mono">
                                          {formatINR(u.unitAmount)}
                                        </td>
                                        <td className="p-2.5 text-center font-semibold text-amber-300">
                                          {u.brokeragePercent}%
                                        </td>
                                        <td className="p-2.5 text-right font-bold text-sky-300 font-mono">
                                          {formatINR(u.totalBrokerage)}
                                        </td>
                                        <td className="p-2.5 text-right font-bold text-emerald-400 font-mono">
                                          {formatINR(u.amountPaid)}
                                        </td>
                                        <td className="p-2.5 text-right font-bold text-rose-300 font-mono">
                                          {formatINR(u.balanceBrokerage)}
                                        </td>
                                        <td className="p-2.5 text-center">
                                          <span
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                              isPaid
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                                : u.amountPaid > 0
                                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                            }`}
                                          >
                                            {isPaid ? 'PAID' : u.amountPaid > 0 ? 'PARTIAL' : 'PENDING'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW MODE 2: CONSOLIDATED UNITS LIST */}
          {viewMode === 'list' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Flat No.</th>
                      <th className="p-3">Brokerage House</th>
                      <th className="p-3">Project</th>
                      <th className="p-3">Tower</th>
                      <th className="p-3">Booking Date</th>
                      <th className="p-3">Buyer Name</th>
                      <th className="p-3 text-right">Unit Amount (₹)</th>
                      <th className="p-3 text-center">Brokerage %</th>
                      <th className="p-3 text-right">Total Brokerage (₹)</th>
                      <th className="p-3 text-right">Amount Paid (₹)</th>
                      <th className="p-3 text-right">Balance Due (₹)</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {allSoldUnits.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-slate-500">
                          No units match the query.
                        </td>
                      </tr>
                    ) : (
                      allSoldUnits.map((u: any) => {
                        const isPaid = u.balanceBrokerage <= 0 && u.totalBrokerage > 0;

                        return (
                          <tr key={`${u.brokerId}-${u.id}`} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 font-bold font-mono text-sky-400">
                              {onOpenFlat360 ? (
                                <button
                                  onClick={() => onOpenFlat360(u.id)}
                                  className="hover:underline cursor-pointer"
                                >
                                  {u.unitNumber}
                                </button>
                              ) : (
                                u.unitNumber
                              )}
                            </td>
                            <td className="p-3 font-semibold text-white">
                              <div>{u.brokerCompany}</div>
                              <div className="text-[10px] text-slate-500">{u.registrationNo}</div>
                            </td>
                            <td className="p-3 text-slate-200">{u.project}</td>
                            <td className="p-3 text-slate-300">{u.tower}</td>
                            <td className="p-3 text-slate-400 font-mono text-[11px]">{u.saleDate}</td>
                            <td className="p-3 text-slate-300">{u.customerName}</td>
                            <td className="p-3 text-right font-bold text-white font-mono">
                              {formatINR(u.unitAmount)}
                            </td>
                            <td className="p-3 text-center font-semibold text-amber-300">
                              {u.brokeragePercent}%
                            </td>
                            <td className="p-3 text-right font-bold text-sky-300 font-mono">
                              {formatINR(u.totalBrokerage)}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-400 font-mono">
                              {formatINR(u.amountPaid)}
                            </td>
                            <td className="p-3 text-right font-bold text-rose-300 font-mono">
                              {formatINR(u.balanceBrokerage)}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  isPaid
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : u.amountPaid > 0
                                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                }`}
                              >
                                {isPaid ? 'PAID' : u.amountPaid > 0 ? 'PARTIAL' : 'PENDING'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
