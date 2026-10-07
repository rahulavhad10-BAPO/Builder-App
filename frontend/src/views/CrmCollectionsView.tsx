import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import {
  Users,
  Building2,
  Calendar,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface CrmCollectionsViewProps {
  projectId: string;
  onOpenFlat360: (flatId: string) => void;
  onOpenRecordPayment: (flatId: string, customerId: string) => void;
}

export const CrmCollectionsView: React.FC<CrmCollectionsViewProps> = ({
  projectId,
  onOpenFlat360,
  onOpenRecordPayment,
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'customers' | 'brokers'>('analytics');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dash, custs, broks] = await Promise.all([
        ApiClient.getCollectionDashboard(projectId),
        ApiClient.getCustomers(),
        ApiClient.getBrokers(),
      ]);
      setDashboardData(dash);
      setCustomers(custs);
      setBrokers(broks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleRunReminderScan = async () => {
    setScanning(true);
    setScanMessage(null);
    try {
      const res = await ApiClient.runReminderScan();
      setScanMessage(`Automated Reminder Scheduler executed: Evaluated ${res.evaluated} demand milestones, sent ${res.remindersSent} notice(s) via idempotency engine.`);
      await loadData();
    } catch (err: any) {
      setScanMessage(err.message || 'Reminder scan failed.');
    } finally {
      setScanning(false);
    }
  };

  const formatINR = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-4">
      {/* Top Header & Tab Switcher */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Sales & Collections Command</h2>
            <p className="text-xs text-slate-400">Customer ledger, automated payment reminders, and revenue recovery</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === 'analytics' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Collection Analytics
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === 'customers' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Customer Directory ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab('brokers')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === 'brokers' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Channel Partners ({brokers.length})
            </button>
          </div>

          {/* Trigger Automated Reminder Scheduler */}
          <button
            onClick={handleRunReminderScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{scanning ? 'Scanning...' : 'Run Reminder Engine'}</span>
          </button>
        </div>
      </div>

      {scanMessage && (
        <div className="p-3 rounded-lg bg-indigo-950/80 border border-indigo-800 text-xs text-indigo-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{scanMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading sales & collections metrics...</div>
      ) : (
        <>
          {/* TAB 1: COLLECTION ANALYTICS */}
          {activeTab === 'analytics' && dashboardData && (
            <div className="space-y-6">
              {/* Analytics Top KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400">Total Agreement Value</div>
                  <div className="text-lg font-bold text-white mt-1">
                    {formatINR(dashboardData.kpis.totalAgreementValue)}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-emerald-900/50">
                  <div className="text-xs text-emerald-400">Total Realized Collection</div>
                  <div className="text-lg font-bold text-emerald-300 mt-1">
                    {formatINR(dashboardData.kpis.totalCollected)}
                  </div>
                  <div className="text-[10px] text-emerald-500 font-semibold mt-0.5">
                    {dashboardData.kpis.collectionPercentage}% Collection Efficiency
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-rose-900/50">
                  <div className="text-xs text-rose-400">Overdue Demands Balance</div>
                  <div className="text-lg font-bold text-rose-300 mt-1">
                    {formatINR(dashboardData.kpis.overdueAmount)}
                  </div>
                  <div className="text-[10px] text-rose-400 font-semibold mt-0.5">
                    {dashboardData.kpis.flatsWithOverdue} Flats with Overdue
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-sky-400">Upcoming Demand (Next 90 Days)</div>
                  <div className="text-lg font-bold text-sky-300 mt-1">
                    {formatINR(dashboardData.kpis.upcomingDemandAmount)}
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Collection By Tower Chart */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <h3 className="text-xs font-bold text-slate-300 uppercase mb-3 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Collection Breakdown by Tower</span>
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.charts.collectionByTower}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="tower" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => `₹${(val / 10000000).toFixed(1)}Cr`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                          formatter={(val: any) => formatINR(Number(val))}
                        />
                        <Bar dataKey="collected" fill="#10b981" name="Collected" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="outstanding" fill="#64748b" name="Outstanding" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Upcoming Demands by Month */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <h3 className="text-xs font-bold text-slate-300 uppercase mb-3 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Projected Milestones Demand Flow</span>
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.charts.upcomingDemandsByMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                          formatter={(val: any) => formatINR(Number(val))}
                        />
                        <Bar dataKey="amount" fill="#38bdf8" name="Projected Demand" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOMERS */}
          {activeTab === 'customers' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Customer Name</th>
                      <th className="p-3">Contact Details</th>
                      <th className="p-3">Owned Property Units</th>
                      <th className="p-3">Total Agreement</th>
                      <th className="p-3">Channel Partner</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {customers.map((c) => {
                      const totalAgr = c.flats.reduce((sum: number, f: any) => sum + f.agreementValue, 0);
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-white">{c.name}</td>
                          <td className="p-3 text-slate-300">
                            <div>{c.email}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{c.phone}</div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {c.flats.map((f: any) => (
                                <button
                                  key={f.id}
                                  onClick={() => onOpenFlat360(f.id)}
                                  className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono font-bold text-[10px] hover:bg-sky-900 cursor-pointer"
                                >
                                  {f.unitNumber}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 font-semibold text-white">{formatINR(totalAgr)}</td>
                          <td className="p-3 text-slate-400">{c.broker?.company || 'Direct'}</td>
                          <td className="p-3 text-right">
                            {c.flats.length > 0 && (
                              <button
                                onClick={() => onOpenRecordPayment(c.flats[0].id, c.id)}
                                className="px-2.5 py-1 rounded bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-semibold hover:bg-emerald-600/30 text-xs cursor-pointer"
                              >
                                Record Payment
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: BROKERS */}
          {activeTab === 'brokers' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Agency / Broker</th>
                      <th className="p-3">Contact Person</th>
                      <th className="p-3">RERA Reg #</th>
                      <th className="p-3">Units Booked</th>
                      <th className="p-3">Booking Gross Value</th>
                      <th className="p-3">Commission Rate</th>
                      <th className="p-3">Paid vs Pending Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {brokers.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <div className="font-bold text-white">{b.company}</div>
                          <div className="text-[10px] text-slate-500">{b.name}</div>
                        </td>
                        <td className="p-3 text-slate-300">
                          <div>{b.contact}</div>
                          <div className="text-[10px] text-slate-500">{b.email}</div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-400">{b.registrationNo || 'Pending'}</td>
                        <td className="p-3 font-bold text-sky-400">{b.metrics.totalBookings} Units</td>
                        <td className="p-3 font-semibold text-white">{formatINR(b.metrics.totalBookingValue)}</td>
                        <td className="p-3">{b.metrics.commissionRate}%</td>
                        <td className="p-3 text-xs">
                          <div className="text-emerald-400 font-semibold">
                            Paid: {formatINR(b.metrics.paidCommission)}
                          </div>
                          <div className="text-amber-400 font-semibold text-[11px]">
                            Pending: {formatINR(b.metrics.pendingCommission)}
                          </div>
                        </td>
                      </tr>
                    ))}
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
