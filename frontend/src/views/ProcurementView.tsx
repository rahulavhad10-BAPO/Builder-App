import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import {
  ShoppingCart,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface ProcurementViewProps {
  projectId: string;
  initialFilters?: any;
}

export const ProcurementView: React.FC<ProcurementViewProps> = ({
  projectId,
  initialFilters,
}) => {
  const [activeTab, setActiveTab] = useState<'demands' | 'pos' | 'exceptions' | 'vendors'>(
    initialFilters?.tab || 'demands'
  );
  const [demands, setDemands] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dRes, poRes, exRes, vRes] = await Promise.all([
        ApiClient.getMaterialDemands({
          projectId: projectId || undefined,
          status: initialFilters?.status || undefined,
        }),
        ApiClient.getPOs({ projectId: projectId || undefined }),
        ApiClient.getPOExceptions(),
        ApiClient.getVendors(),
      ]);
      setDemands(dRes);
      setPos(poRes);
      setExceptions(exRes);
      setVendors(vRes);
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

  const handleRefreshOverdue = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.refreshMaterialOverdue();
      setFeedback(`Refreshed overdue status across all demands: Checked ${res.checked}, updated ${res.updated}, dispatched ${res.emailsSent} alert email(s).`);
      await loadData();
    } catch (e: any) {
      setFeedback(e.message || 'Error evaluating overdue demands');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveException = async (id: string) => {
    setResolvingId(id);
    try {
      await ApiClient.resolvePOException(id);
      setFeedback('PO Exception marked as resolved with audit trail.');
      await loadData();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to resolve exception.');
    } finally {
      setResolvingId(null);
    }
  };

  const formatINR = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Procurement & PO Verification Engine</h2>
            <p className="text-xs text-slate-400">Automated mismatch detection, material demands, and vendor lifecycle</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('demands')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === 'demands' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Material Demands ({demands.length})
            </button>
            <button
              onClick={() => setActiveTab('exceptions')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'exceptions'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              <span>PO Exceptions ({exceptions.filter(e => !e.resolved).length})</span>
            </button>
            <button
              onClick={() => setActiveTab('pos')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === 'pos' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Purchase Orders ({pos.length})
            </button>
            <button
              onClick={() => setActiveTab('vendors')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === 'vendors' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Vendors ({vendors.length})
            </button>
          </div>

          <button
            onClick={handleRefreshOverdue}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Scan Overdue</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-sky-950/80 border border-sky-800 text-xs text-sky-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-sky-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading procurement records...</div>
      ) : (
        <>
          {/* TAB 1: MATERIAL DEMANDS */}
          {activeTab === 'demands' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Demand ID</th>
                      <th className="p-3">Material Item</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Required Date</th>
                      <th className="p-3">Site Requester</th>
                      <th className="p-3">Procurement Lead</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {demands.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-white">{d.demandNumber}</td>
                        <td className="p-3">
                          <div className="font-semibold text-white">{d.item.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{d.item.itemCode}</div>
                        </td>
                        <td className="p-3 font-bold text-sky-400">
                          {d.quantity.toLocaleString()} {d.item.unit}
                        </td>
                        <td className="p-3">
                          <div className="text-white">{new Date(d.requiredDate).toLocaleDateString('en-IN')}</div>
                          {d.isOverdue && (
                            <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>OVERDUE</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-slate-300">{d.requesterName}</td>
                        <td className="p-3 text-slate-300">{d.procurementPerson}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.priority === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {d.priority}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.status === 'OVERDUE'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : d.status === 'ORDERED'
                                ? 'bg-sky-500/20 text-sky-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PO EXCEPTIONS (VERIFICATION ENGINE) */}
          {activeTab === 'exceptions' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                <div>
                  <div className="font-bold">PO Verification Engine Output</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Automated comparison between Approved Site Demands vs Purchase Order line items. Detected anomalies require authorized resolution.
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">PO Number</th>
                        <th className="p-3">Vendor</th>
                        <th className="p-3">Exception Category</th>
                        <th className="p-3">Automated Engine Finding</th>
                        <th className="p-3">Detected At</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {exceptions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            No PO exceptions detected. All purchase orders match approved demands.
                          </td>
                        </tr>
                      ) : (
                        exceptions.map((ex) => (
                          <tr key={ex.id} className="hover:bg-slate-800/40">
                            <td className="p-3 font-mono font-bold text-sky-400">{ex.po?.poNumber}</td>
                            <td className="p-3 text-white font-medium">{ex.po?.vendor?.name}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                {ex.type.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="p-3 text-slate-200 max-w-md">{ex.message}</td>
                            <td className="p-3 text-slate-400">{new Date(ex.createdAt).toLocaleString('en-IN')}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  ex.resolved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {ex.resolved ? 'Resolved' : 'Active Exception'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              {!ex.resolved && (
                                <button
                                  disabled={resolvingId === ex.id}
                                  onClick={() => handleResolveException(ex.id)}
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold border border-slate-700 transition-colors cursor-pointer"
                                >
                                  {resolvingId === ex.id ? 'Resolving...' : 'Authorize / Resolve'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PURCHASE ORDERS */}
          {activeTab === 'pos' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">PO Number</th>
                      <th className="p-3">Vendor</th>
                      <th className="p-3">Target Demand</th>
                      <th className="p-3">Delivery Date</th>
                      <th className="p-3">Total Amount</th>
                      <th className="p-3">Verification</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {pos.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-white">{po.poNumber}</td>
                        <td className="p-3 text-slate-200 font-medium">{po.vendor.name}</td>
                        <td className="p-3 font-mono text-slate-400">{po.demand?.demandNumber || 'Stock Order'}</td>
                        <td className="p-3 text-slate-300">{new Date(po.deliveryDate).toLocaleDateString('en-IN')}</td>
                        <td className="p-3 font-bold text-white">{formatINR(po.totalAmount)}</td>
                        <td className="p-3">
                          {po.exceptions.length > 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {po.exceptions.length} Anomaly
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 flex items-center gap-1 w-max">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Verified</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                            {po.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: VENDORS */}
          {activeTab === 'vendors' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vendors.map((v) => (
                <div key={v.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">{v.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-sky-400 font-semibold">
                      {v.code}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Contact: <span className="text-slate-200">{v.contactPerson}</span> ({v.phone})
                  </div>
                  <div className="text-xs text-slate-400">
                    Email: <span className="text-slate-200">{v.email}</span>
                  </div>
                  <div className="text-xs text-slate-400">Address: {v.address}</div>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-xs">
                    <span className="text-emerald-400 font-bold">Rating: {v.rating} / 5.0</span>
                    <span className="text-slate-400">{v._count?.purchaseOrders || 0} Purchase Orders</span>
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
