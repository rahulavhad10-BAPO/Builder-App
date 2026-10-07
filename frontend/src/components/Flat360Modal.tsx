import React, { useState, useEffect } from 'react';
import { ApiClient } from '../api/client.js';
import {
  X,
  CreditCard,
  Calendar,
  AlertTriangle,
  Send,
  PlusCircle,
} from 'lucide-react';

interface Flat360ModalProps {
  flatId: string | null;
  onClose: () => void;
  onOpenRecordPayment: (flatId: string, customerId: string) => void;
  onRefreshData?: () => void;
}

export const Flat360Modal: React.FC<Flat360ModalProps> = ({
  flatId,
  onClose,
  onOpenRecordPayment,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<string>('summary');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!flatId) return;
    setLoading(true);
    try {
      const res = await ApiClient.getFlat360(flatId);
      setData(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [flatId]);

  if (!flatId) return null;

  const handleSendReminder = async (demandId: string) => {
    setRemindingId(demandId);
    setActionMessage(null);
    try {
      const res = await ApiClient.sendDemandReminder(demandId, 'CUSTOM');
      if (res.success) {
        setActionMessage(`Payment reminder notice successfully emailed to ${res.reminder?.recipient}!`);
        await loadData();
        if (onRefreshData) onRefreshData();
      } else {
        setActionMessage(res.message || 'Reminder was not sent.');
      }
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to dispatch email reminder.');
    } finally {
      setRemindingId(null);
    }
  };

  const tabs = [
    { id: 'summary', label: 'Payment Summary' },
    { id: 'overview', label: 'Unit Overview' },
    { id: 'payments', label: `Payments (${data?.paymentHistory?.length || 0})` },
    { id: 'demands', label: `Demand History (${data?.demandHistory?.length || 0})` },
    { id: 'upcoming', label: `Upcoming Demands (${data?.upcomingDemands?.length || 0})` },
    { id: 'reminders', label: `Reminder Logs (${data?.reminderHistory?.length || 0})` },
    { id: 'documents', label: 'Documents' },
    { id: 'notes', label: 'Notes & Activity' },
  ];

  const formatCurrency = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-bold text-base border border-sky-500/30">
              Unit {data?.overview?.unitNumber || '...'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {data?.overview?.project} - {data?.overview?.building}
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {data?.overview?.status}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Customer: <span className="text-slate-200 font-semibold">{data?.overview?.customer?.name || 'Available / Unsold'}</span>
                {data?.overview?.customer?.phone && ` (${data.overview.customer.phone})`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {data?.overview?.customer && (
              <button
                onClick={() => onOpenRecordPayment(flatId, data.overview.customer.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Nav Tabs */}
        <div className="px-5 border-b border-slate-800 bg-slate-900/90 flex gap-2 overflow-x-auto shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Action feedback message */}
        {actionMessage && (
          <div className="mx-5 mt-3 p-2.5 rounded-lg bg-sky-950/80 border border-sky-800/60 text-xs text-sky-300 flex items-center justify-between">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="text-sky-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
              Loading Flat 360 data...
            </div>
          ) : !data ? (
            <div className="text-rose-400 text-sm py-10">Error loading record.</div>
          ) : (
            <>
              {/* TAB 1: PAYMENT SUMMARY */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60">
                      <div className="text-xs text-slate-400">Agreement Value</div>
                      <div className="text-base font-bold text-white mt-1">
                        {formatCurrency(data.paymentSummary.agreementValue)}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60">
                      <div className="text-xs text-slate-400">Total Demanded Due</div>
                      <div className="text-base font-bold text-white mt-1">
                        {formatCurrency(data.paymentSummary.totalAmountDue)}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
                      <div className="text-xs text-emerald-400">Total Paid (Receipted)</div>
                      <div className="text-base font-bold text-emerald-300 mt-1">
                        {formatCurrency(data.paymentSummary.totalPaid)}
                      </div>
                      <div className="text-[10px] text-emerald-500 font-medium mt-0.5">
                        Collection: {data.paymentSummary.collectionPercentage}%
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60">
                      <div className="text-xs text-slate-400">Total Outstanding</div>
                      <div className="text-base font-bold text-white mt-1">
                        {formatCurrency(data.paymentSummary.outstanding)}
                      </div>
                    </div>
                  </div>

                  {/* Overdue / Upcoming Highlights */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Overdue Demand Balance</span>
                        </div>
                        <span className="text-sm font-bold text-rose-300">
                          {formatCurrency(data.paymentSummary.overdueAmount)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {data.paymentSummary.overdueAmount > 0
                          ? 'This property has overdue construction milestones. Automated reminders have been queued.'
                          : 'No overdue payment obligations on this unit.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-800/40">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs">
                          <Calendar className="w-4 h-4" />
                          <span>Next Demand Milestone</span>
                        </div>
                        <span className="text-sm font-bold text-sky-300">
                          {data.paymentSummary.nextDemandAmount > 0
                            ? formatCurrency(data.paymentSummary.nextDemandAmount)
                            : 'Nil'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {data.paymentSummary.nextDemandDate
                          ? `Due on ${new Date(data.paymentSummary.nextDemandDate).toLocaleDateString('en-IN')}`
                          : 'All scheduled milestones cleared.'}
                      </p>
                    </div>
                  </div>

                  {/* Last Payment Card */}
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-slate-700 text-sky-400">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">Last Payment Recorded</div>
                        <div className="text-[11px] text-slate-400">
                          {data.paymentSummary.lastPaymentDate
                            ? `Receipted on ${new Date(data.paymentSummary.lastPaymentDate).toLocaleDateString('en-IN')}`
                            : 'No payment recorded yet'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400">
                        {formatCurrency(data.paymentSummary.lastPaymentAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="text-slate-400">Configuration</div>
                    <div className="text-sm font-semibold text-white mt-1">{data.overview.configuration}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="text-slate-400">Carpet / Saleable Area</div>
                    <div className="text-sm font-semibold text-white mt-1">
                      {data.overview.carpetArea} sq.ft / {data.overview.saleableArea} sq.ft
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="text-slate-400">Parking Allocated</div>
                    <div className="text-sm font-semibold text-white mt-1">{data.overview.parking || 'Standard'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="text-slate-400">Floor Level</div>
                    <div className="text-sm font-semibold text-white mt-1">Level {data.overview.floorNumber}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="text-slate-400">Relationship Manager</div>
                    <div className="text-sm font-semibold text-white mt-1">
                      {data.overview.salesExecutiveName || 'Unassigned'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="text-slate-400">Channel Partner / Broker</div>
                    <div className="text-sm font-semibold text-white mt-1">
                      {data.overview.broker?.company || 'Direct Sales'}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PAYMENT HISTORY */}
              {activeTab === 'payments' && (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Receipt #</th>
                          <th className="p-2.5">Payment Date</th>
                          <th className="p-2.5">Amount</th>
                          <th className="p-2.5">Mode</th>
                          <th className="p-2.5">Transaction Ref</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {data.paymentHistory.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-slate-500">
                              No payments recorded yet.
                            </td>
                          </tr>
                        ) : (
                          data.paymentHistory.map((p: any) => (
                            <tr key={p.id} className="hover:bg-slate-800/40">
                              <td className="p-2.5 font-mono text-sky-400">{p.receiptNumber}</td>
                              <td className="p-2.5">{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                              <td className="p-2.5 font-bold text-emerald-400">{formatCurrency(p.amount)}</td>
                              <td className="p-2.5">{p.paymentMode}</td>
                              <td className="p-2.5 font-mono text-slate-400">{p.transactionRef}</td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: DEMAND HISTORY */}
              {activeTab === 'demands' && (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Demand ID</th>
                          <th className="p-2.5">Milestone Type</th>
                          <th className="p-2.5">Due Date</th>
                          <th className="p-2.5">Total Amount</th>
                          <th className="p-2.5">Paid</th>
                          <th className="p-2.5">Balance</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {data.demandHistory.map((d: any) => {
                          const isOverdue = d.status === 'OVERDUE';
                          return (
                            <tr key={d.id} className="hover:bg-slate-800/40">
                              <td className="p-2.5 font-mono text-white font-medium">{d.demandNumber}</td>
                              <td className="p-2.5">{d.demandType.replace(/_/g, ' ')}</td>
                              <td className="p-2.5">{new Date(d.dueDate).toLocaleDateString('en-IN')}</td>
                              <td className="p-2.5">{formatCurrency(d.totalAmount)}</td>
                              <td className="p-2.5 text-emerald-400 font-semibold">{formatCurrency(d.paidAmount)}</td>
                              <td className="p-2.5 text-white font-bold">{formatCurrency(d.balanceAmount)}</td>
                              <td className="p-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    d.status === 'PAID'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : isOverdue
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                      : 'bg-amber-500/20 text-amber-300'
                                  }`}
                                >
                                  {d.status} {d.daysOverdue > 0 && `(+${d.daysOverdue}d)`}
                                </span>
                              </td>
                              <td className="p-2.5">
                                {d.balanceAmount > 0 && (
                                  <button
                                    disabled={remindingId === d.id}
                                    onClick={() => handleSendReminder(d.id)}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[11px] font-semibold transition-colors cursor-pointer"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>{remindingId === d.id ? 'Sending...' : 'Send Reminder'}</span>
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

              {/* TAB 5: UPCOMING DEMANDS */}
              {activeTab === 'upcoming' && (
                <div className="space-y-3">
                  {data.upcomingDemands.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No upcoming demands scheduled.
                    </div>
                  ) : (
                    data.upcomingDemands.map((ud: any, idx: number) => (
                      <div
                        key={ud.id}
                        className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">
                              {ud.demandType.replace(/_/g, ' ')} ({ud.demandNumber})
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Scheduled Due Date: {new Date(ud.dueDate).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-sky-300">
                          {formatCurrency(ud.balanceAmount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 6: REMINDER HISTORY */}
              {activeTab === 'reminders' && (
                <div className="space-y-2">
                  {data.reminderHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No reminders sent for this unit yet.
                    </div>
                  ) : (
                    data.reminderHistory.map((r: any) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white">{r.reminderType.replace(/_/g, ' ')}</div>
                          <div className="text-[11px] text-slate-400">
                            Sent to: {r.recipient} on {r.sentDate ? new Date(r.sentDate).toLocaleString('en-IN') : 'Scheduled'}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                          {r.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 7: DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="space-y-2">
                  {data.documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{doc.name}</div>
                        <div className="text-[11px] text-slate-400">
                          Category: {doc.category} | Version: v{doc.version}
                        </div>
                      </div>
                      <a
                        href={`/uploads/${doc.storageReference}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sky-300 text-[11px] font-semibold"
                      >
                        View File
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 8: NOTES / ACTIVITY */}
              {activeTab === 'notes' && (
                <div className="space-y-3">
                  {data.notesActivity.map((note: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs">
                      <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                        <span>{note.author}</span>
                        <span>{new Date(note.timestamp).toLocaleString('en-IN')}</span>
                      </div>
                      <p className="text-slate-200">{note.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
