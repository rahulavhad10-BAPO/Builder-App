import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  ShoppingCart,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  Send,
  AlertOctagon,
} from 'lucide-react';

interface ProcurementViewProps {
  projectId: string;
  initialFilters?: any;
}

export const ProcurementView: React.FC<ProcurementViewProps> = ({
  projectId,
  initialFilters,
}) => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'demands' | 'pos' | 'exceptions' | 'discrepancy' | 'vendors'>(
    initialFilters?.tab || 'demands'
  );
  const [demands, setDemands] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [actingPoId, setActingPoId] = useState<string | null>(null);
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
      setFeedback(`Refreshed overdue status across demands: Checked ${res.checked}, updated ${res.updated}, dispatched ${res.emailsSent} alert email(s).`);
      await loadData();
    } catch (e: any) {
      setFeedback(e.message || 'Error evaluating overdue demands');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePO = async (poId: string) => {
    if (!isAdmin) {
      alert('Only Admin roles can approve Purchase Orders.');
      return;
    }
    setActingPoId(poId);
    try {
      await ApiClient.approvePO(poId);
      setFeedback('Purchase Order approved successfully. It is now cleared for vendor order placement.');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve PO');
    } finally {
      setActingPoId(null);
    }
  };

  const handlePlaceOrder = async (poId: string) => {
    setActingPoId(poId);
    try {
      await ApiClient.placeOrder(poId);
      setFeedback('Order placed with vendor. Material delivery tracking initialized.');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to place order');
    } finally {
      setActingPoId(null);
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

  // Synthesize discrepancy items for PO vs Invoice vs Goods Received verification
  const discrepancyItems = [
    {
      id: 'disc-1',
      poNumber: 'PO-2026-001',
      vendor: 'Ambuja Cements Ltd',
      item: 'OPC 53 Grade Cement',
      poQty: 500,
      receivedQty: 460,
      invoiceQty: 500,
      poUnitPrice: 380,
      invoiceUnitPrice: 395,
      unit: 'Bags',
      status: 'DISCREPANCY_DETECTED',
      qtyVariance: -40, // 40 bags short
      priceVariance: 15, // Invoiced ₹15 higher per bag
      notes: 'GRN indicates 40 torn bags rejected at unloading bay; Vendor invoice billed for full 500 bags with ₹15 rate escalation.',
    },
    {
      id: 'disc-2',
      poNumber: 'PO-2026-003',
      vendor: 'Tata Steel Ltd',
      item: 'TMT Rebars Fe 500D (16mm)',
      poQty: 25,
      receivedQty: 25,
      invoiceQty: 25,
      poUnitPrice: 62000,
      invoiceUnitPrice: 62000,
      unit: 'MT',
      status: 'MATCHED_VERIFIED',
      qtyVariance: 0,
      priceVariance: 0,
      notes: '3-way reconciliation complete: Weighbridge slip matches PO and tax invoice exactly.',
    },
    {
      id: 'disc-3',
      poNumber: 'PO-2026-004',
      vendor: 'UltraTech ReadyMix',
      item: 'RMC M30 Grade Concrete',
      poQty: 120,
      receivedQty: 112,
      invoiceQty: 120,
      poUnitPrice: 4600,
      invoiceUnitPrice: 4600,
      unit: 'Cum',
      status: 'DISCREPANCY_DETECTED',
      qtyVariance: -8, // 8 Cum short
      priceVariance: 0,
      notes: 'Transit slump test failure caused return of 1 transit mixer (8 Cum). Invoice must be debited by ₹36,800.',
    },
  ];

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
            <p className="text-xs text-slate-400">
              Demand aggregation, PO approval hierarchy, 3-way discrepancy checks & vendor management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs flex-wrap">
          <button
            onClick={() => setActiveTab('demands')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'demands' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Material Demands ({demands.length})
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
            onClick={() => setActiveTab('discrepancy')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'discrepancy' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            PO vs Invoice Check
          </button>
          <button
            onClick={() => setActiveTab('exceptions')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'exceptions' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Exceptions ({exceptions.length})
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

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading procurement data...</div>
      ) : (
        <>
          {/* TAB 1: MATERIAL DEMANDS */}
          {activeTab === 'demands' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={handleRefreshOverdue}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                  <span>Evaluate Overdue Demands</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Demand #</th>
                        <th className="p-3">Material</th>
                        <th className="p-3">Required Qty</th>
                        <th className="p-3">Required Date</th>
                        <th className="p-3">Requester</th>
                        <th className="p-3">Procurement Lead</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {demands.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-bold text-sky-400">{d.demandNumber}</td>
                          <td className="p-3 font-semibold text-white">{d.materialName}</td>
                          <td className="p-3 font-bold text-slate-200">{d.quantity} {d.unit}</td>
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
            </div>
          )}

          {/* TAB 2: PURCHASE ORDERS WITH APPROVAL & ORDER PLACEMENT */}
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
                      <th className="p-3">PO Status</th>
                      <th className="p-3 text-right">Workflow Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {pos.map((po) => {
                      const isPendingApproval = po.status === 'PENDING_APPROVAL' || po.status === 'DRAFT';
                      const isApproved = po.status === 'APPROVED';

                      return (
                        <tr key={po.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-bold text-sky-400">{po.poNumber}</td>
                          <td className="p-3 text-slate-200 font-medium">{po.vendor?.name}</td>
                          <td className="p-3 font-mono text-slate-400">{po.demand?.demandNumber || 'Inventory Replenishment'}</td>
                          <td className="p-3 text-slate-300">{new Date(po.deliveryDate).toLocaleDateString('en-IN')}</td>
                          <td className="p-3 font-bold text-white">{formatINR(po.totalAmount)}</td>
                          <td className="p-3">
                            {po.exceptions?.length > 0 ? (
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
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                po.status === 'ORDERED'
                                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                  : po.status === 'APPROVED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : isPendingApproval
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {po.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Admin Approve PO button */}
                              {isPendingApproval && isAdmin && (
                                <button
                                  onClick={() => handleApprovePO(po.id)}
                                  disabled={actingPoId === po.id}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer shadow-sm"
                                >
                                  <FileCheck2 className="w-3.5 h-3.5" />
                                  <span>{actingPoId === po.id ? 'Approving...' : 'Approve PO'}</span>
                                </button>
                              )}

                              {/* Place Order Button */}
                              {isApproved && (
                                <button
                                  onClick={() => handlePlaceOrder(po.id)}
                                  disabled={actingPoId === po.id}
                                  className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer shadow-sm"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>{actingPoId === po.id ? 'Placing...' : 'Place Order'}</span>
                                </button>
                              )}

                              {po.status === 'ORDERED' && (
                                <span className="text-[11px] text-slate-400 font-mono">Order Dispatched</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PO VS INVOICE & GOODS RECEIVED DISCREPANCY CHECKER */}
          {activeTab === 'discrepancy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <AlertOctagon className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-white text-sm">3-Way Procurement Reconciliation</h3>
                </div>
                <p className="text-slate-400">
                  Cross-verification engine comparing Original Approved PO items, physical Goods Received Notes (GRN), and Vendor Invoices to highlight quantity shortfalls and unauthorized price escalations.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">PO Reference</th>
                        <th className="p-3">Vendor & Material</th>
                        <th className="p-3">PO Ordered Qty</th>
                        <th className="p-3">Physical Received</th>
                        <th className="p-3">Invoiced Qty</th>
                        <th className="p-3">PO Rate vs Invoice Rate</th>
                        <th className="p-3">Discrepancy Audit Status</th>
                        <th className="p-3">Remarks & Root Cause</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {discrepancyItems.map((item) => {
                        const hasQtyDiscrepancy = item.qtyVariance !== 0 || item.receivedQty !== item.invoiceQty;
                        const hasPriceDiscrepancy = item.priceVariance !== 0;

                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors ${
                              hasQtyDiscrepancy || hasPriceDiscrepancy
                                ? 'bg-rose-950/20 border-l-4 border-l-rose-500'
                                : 'bg-slate-900/40 hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="p-3 font-mono font-bold text-sky-400">{item.poNumber}</td>
                            <td className="p-3">
                              <div className="font-semibold text-white">{item.item}</div>
                              <div className="text-[10px] text-slate-400">{item.vendor}</div>
                            </td>
                            <td className="p-3 font-mono text-slate-300">
                              {item.poQty} {item.unit}
                            </td>
                            <td className="p-3 font-mono">
                              <span className={item.receivedQty < item.poQty ? 'text-rose-400 font-bold' : 'text-emerald-400 font-semibold'}>
                                {item.receivedQty} {item.unit}
                              </span>
                            </td>
                            <td className="p-3 font-mono">
                              <span className={item.invoiceQty !== item.receivedQty ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                                {item.invoiceQty} {item.unit}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-mono text-slate-300">PO: ₹{item.poUnitPrice}</div>
                              {hasPriceDiscrepancy ? (
                                <div className="font-mono text-rose-400 font-bold text-[11px]">
                                  Inv: ₹{item.invoiceUnitPrice} (+₹{item.priceVariance})
                                </div>
                              ) : (
                                <div className="font-mono text-emerald-400 text-[11px]">Inv: ₹{item.invoiceUnitPrice} (Matched)</div>
                              )}
                            </td>
                            <td className="p-3">
                              {hasQtyDiscrepancy || hasPriceDiscrepancy ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-max">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                  <span>DISCREPANCY</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 flex items-center gap-1 w-max">
                                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                  <span>RECONCILED</span>
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-300 max-w-xs text-[11px] leading-relaxed">
                              {item.notes}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PO EXCEPTIONS */}
          {activeTab === 'exceptions' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                <div>
                  <div className="font-bold">Automated Exception Engine Output</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Continuous validation between Approved Site Demands and Purchase Order line items.
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
                        <th className="p-3">Finding</th>
                        <th className="p-3">Detected At</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {exceptions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            No active PO exceptions.
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

          {/* TAB 5: VENDORS */}
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
