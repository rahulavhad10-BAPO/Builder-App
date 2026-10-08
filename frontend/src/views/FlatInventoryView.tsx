import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import type { Flat } from '../types/index.js';
import {
  Search,
  Download,
  Eye,
  Building,
  Mail,
  FileText,
  Upload,
  CheckCircle2,
  X,
  AlertCircle,
  Calendar,
  Send,
} from 'lucide-react';

interface FlatInventoryViewProps {
  projectId: string;
  initialFilters?: any;
  onOpenFlat360: (flatId: string) => void;
  onOpenRecordPayment: (flatId: string, customerId: string) => void;
}

export const FlatInventoryView: React.FC<FlatInventoryViewProps> = ({
  projectId,
  initialFilters,
  onOpenFlat360,
  onOpenRecordPayment,
}) => {
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [configFilter, setConfigFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>(initialFilters?.paymentStatus || '');

  // Trigger Mail modal state
  const [mailModalFlat, setMailModalFlat] = useState<Flat | null>(null);
  const [mailSubject, setMailSubject] = useState<string>('');
  const [mailBody, setMailBody] = useState<string>('');
  const [sendingMail, setSendingMail] = useState<boolean>(false);
  const [mailSuccess, setMailSuccess] = useState<string | null>(null);

  // View All Demands modal state
  const [viewDemandsFlat, setViewDemandsFlat] = useState<Flat | null>(null);
  const [flatDemands, setFlatDemands] = useState<any[]>([]);
  const [loadingDemands, setLoadingDemands] = useState<boolean>(false);

  // Import CSV modal state
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [csvInput, setCsvInput] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const loadFlats = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getFlats({
        projectId: projectId || undefined,
        status: statusFilter || undefined,
        configuration: configFilter || undefined,
        paymentStatus: paymentFilter || undefined,
        search: search || undefined,
      });
      setFlats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialFilters?.paymentStatus) {
      setPaymentFilter(initialFilters.paymentStatus);
    }
  }, [initialFilters]);

  useEffect(() => {
    loadFlats();
  }, [projectId, statusFilter, configFilter, paymentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadFlats();
  };

  const formatINR = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      AVAILABLE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      BLOCKED: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      BOOKED: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      AGREEMENT: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      SOLD: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      CANCELLED: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    };
    return map[status] || 'bg-slate-800 text-slate-300 border-slate-700';
  };

  // Open Mail Draft Modal
  const openTriggerMail = (flat: Flat) => {
    setMailModalFlat(flat);
    setMailSuccess(null);
    const custName = flat.customer?.name || 'Customer';
    const overdueAmt = flat.overdueAmount > 0 ? flat.overdueAmount : (flat.outstanding || 0);
    const dueDate = flat.nextDemand?.dueDate ? new Date(flat.nextDemand.dueDate).toLocaleDateString('en-IN') : 'Immediate';
    
    setMailSubject(`Payment Demand Notice - Unit ${flat.unitNumber} | Overdue ₹${overdueAmt.toLocaleString('en-IN')}`);
    setMailBody(`Dear ${custName},\n\n` +
      `This is a formal reminder regarding the milestone payment demand for your property Unit ${flat.unitNumber}.\n\n` +
      `Outstanding / Overdue Amount: ₹${overdueAmt.toLocaleString('en-IN')}\n` +
      `Payment Due Date: ${dueDate}\n\n` +
      `Please remit the payment via RTGS/NEFT to the following Escrow Account:\n` +
      `• Beneficiary Name: Builder Escrow Account\n` +
      `• Bank Name: HDFC Bank Limited\n` +
      `• Account No: 50200088921004\n` +
      `• IFSC Code: HDFC0000240\n\n` +
      `Kindly ignore if payment has already been credited.\n\nWarm regards,\nBuilder Operations & CRM Team`);
  };

  // Send Mail Action
  const handleSendMail = async () => {
    if (!mailModalFlat) return;
    setSendingMail(true);
    try {
      if (mailModalFlat.lastDemand?.id) {
        await ApiClient.sendDemandReminder(mailModalFlat.lastDemand.id, 'EMAIL');
      }
      setMailSuccess(`Email dispatched successfully to ${mailModalFlat.customer?.email || 'customer'}!`);
      setTimeout(() => {
        setMailModalFlat(null);
        setMailSuccess(null);
      }, 1500);
    } catch (e: any) {
      alert(e.message || 'Failed to dispatch email notice');
    } finally {
      setSendingMail(false);
    }
  };

  // Open All Demands Modal
  const openViewDemands = async (flat: Flat) => {
    setViewDemandsFlat(flat);
    setLoadingDemands(true);
    try {
      const demands = await ApiClient.getFlatDemands(flat.id);
      setFlatDemands(demands);
    } catch (e) {
      console.error(e);
      setFlatDemands([]);
    } finally {
      setLoadingDemands(false);
    }
  };

  // Handle CSV Import
  const handleCSVImport = async () => {
    if (!csvInput.trim()) {
      alert('Please provide CSV content to import.');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await ApiClient.importFlatCSV(csvInput, projectId || undefined);
      setImportResult(`Successfully imported ${res.importedCount} units!`);
      loadFlats();
      setTimeout(() => {
        setShowImportModal(false);
        setImportResult(null);
        setCsvInput('');
      }, 1500);
    } catch (e: any) {
      alert(e.message || 'CSV Import failed. Check CSV format.');
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvInput(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  const loadSampleCSVTemplate = () => {
    const sample = `unitNumber,tower,floorNumber,configuration,carpetArea,saleableArea,basePrice,agreementValue,status,customerName,customerEmail,customerPhone\n` +
      `B-101,Tower B,1,2BHK,750,1050,8500000,9200000,SOLD,Vikram Patel,vikram.patel@example.com,+91 98201 11223\n` +
      `B-102,Tower B,1,3BHK,1120,1580,12500000,13500000,BOOKED,Sneha Desai,sneha.desai@example.com,+91 98202 22334\n` +
      `B-103,Tower B,1,2BHK,750,1050,8500000,8500000,AVAILABLE,,,`;
    setCsvInput(sample);
  };

  const handleExportCSV = () => {
    const headers = ['Flat No', 'Tower', 'Floor', 'Config', 'Status', 'Customer', 'Agreement Value', 'Amount Paid', 'Outstanding', 'Overdue Amount', 'Due Date', 'Last Demand'];
    const rows = flats.map(f => [
      f.unitNumber,
      f.building?.name || '',
      f.floorNumber,
      f.configuration,
      f.status,
      f.customer?.name || 'Unsold',
      f.agreementValue,
      f.amountPaid,
      f.outstanding,
      f.overdueAmount,
      f.nextDemand?.dueDate ? new Date(f.nextDemand.dueDate).toLocaleDateString('en-IN') : '',
      f.lastDemand?.demandNumber || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `flat_inventory_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Flat & Unit Inventory Master</h2>
            <p className="text-xs text-slate-400">
              Commercial real-estate unit registry ({flats.length} Units loaded)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative md:col-span-2">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Unit #, Customer, Phone..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white focus:outline-none focus:border-sky-500 text-xs"
          />
        </form>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500 text-xs"
        >
          <option value="">All Unit Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="BOOKED">Booked</option>
          <option value="AGREEMENT">Agreement Executed</option>
          <option value="SOLD">Sold</option>
          <option value="BLOCKED">Blocked</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Configuration Filter */}
        <select
          value={configFilter}
          onChange={(e) => setConfigFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500 text-xs"
        >
          <option value="">All Configurations</option>
          <option value="2BHK">2 BHK</option>
          <option value="3BHK">3 BHK</option>
          <option value="4BHK">4 BHK</option>
        </select>

        {/* Payment / Demand Status Filter */}
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500 text-xs"
        >
          <option value="">All Payment Health</option>
          <option value="OVERDUE">Has Overdue Demands</option>
          <option value="PARTIAL">Partially Paid</option>
          <option value="PAID">Fully Paid</option>
          <option value="NO_PAYMENT">No Payment Recorded</option>
        </select>
      </div>

      {/* Main Flat Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Unit #</th>
                <th className="p-3">Tower & Floor</th>
                <th className="p-3">Config & Area</th>
                <th className="p-3">Status</th>
                <th className="p-3">Customer Profile</th>
                <th className="p-3">Agreement Value</th>
                <th className="p-3">Amount Paid</th>
                <th className="p-3">Outstanding</th>
                <th className="p-3">Overdue & Due Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Loading units...
                  </td>
                </tr>
              ) : flats.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No property units match the selected filters.
                  </td>
                </tr>
              ) : (
                flats.map((flat) => {
                  const isOverdue = flat.overdueAmount > 0;
                  const nextDueDate = flat.nextDemand?.dueDate ? new Date(flat.nextDemand.dueDate).toLocaleDateString('en-IN') : null;

                  return (
                    <tr
                      key={flat.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Unit Number */}
                      <td className="p-3">
                        <button
                          onClick={() => onOpenFlat360(flat.id)}
                          className="font-bold text-sky-400 hover:text-sky-300 font-mono text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <span>{flat.unitNumber}</span>
                          <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>

                      {/* Tower & Floor */}
                      <td className="p-3 text-slate-300">
                        <div>{flat.building?.name || 'Main Tower'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Floor {flat.floorNumber}</div>
                      </td>

                      {/* Config */}
                      <td className="p-3 text-slate-300">
                        <div className="font-semibold">{flat.configuration}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {flat.carpetArea} / {flat.saleableArea} sq.ft
                        </div>
                      </td>

                      {/* Unit Status */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(flat.status)}`}>
                          {flat.status}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="p-3">
                        {flat.customer ? (
                          <div>
                            <div className="font-semibold text-white">{flat.customer.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{flat.customer.phone}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Available</span>
                        )}
                      </td>

                      {/* Agreement Value */}
                      <td className="p-3 font-semibold text-white">
                        {formatINR(flat.agreementValue)}
                      </td>

                      {/* Amount Paid */}
                      <td className="p-3 font-bold text-emerald-400">
                        {formatINR(flat.amountPaid)}
                        {flat.collectionPercentage > 0 && (
                          <div className="text-[10px] text-emerald-500 font-medium">
                            {flat.collectionPercentage}%
                          </div>
                        )}
                      </td>

                      {/* Outstanding */}
                      <td className="p-3 font-semibold text-slate-300">
                        {formatINR(flat.outstanding)}
                      </td>

                      {/* Overdue Amount & Due Date */}
                      <td className="p-3">
                        {isOverdue ? (
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-block mb-1">
                              Overdue {formatINR(flat.overdueAmount)}
                            </span>
                            {nextDueDate && (
                              <div className="text-[10px] text-rose-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Due: {nextDueDate}</span>
                              </div>
                            )}
                          </div>
                        ) : flat.amountPaid >= flat.agreementValue && flat.agreementValue > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                            100% Cleared
                          </span>
                        ) : nextDueDate ? (
                          <div>
                            <span className="text-[11px] text-slate-300">Pending</span>
                            <div className="text-[10px] text-sky-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              <span>Due: {nextDueDate}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[10px]">No Dues Pending</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* View All Demands */}
                          <button
                            onClick={() => openViewDemands(flat)}
                            title="View all demands & payment status"
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[11px] font-medium border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Demands</span>
                          </button>

                          {/* Trigger Mail */}
                          {flat.customer && (
                            <button
                              onClick={() => openTriggerMail(flat)}
                              title="Draft and trigger demand notice email"
                              className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-medium border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Mail className="w-3 h-3" />
                              <span>Trigger Mail</span>
                            </button>
                          )}

                          {/* Flat 360 */}
                          <button
                            onClick={() => onOpenFlat360(flat.id)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            360°
                          </button>

                          {/* Pay */}
                          {flat.customer && (
                            <button
                              onClick={() => onOpenRecordPayment(flat.id, flat.customer!.id)}
                              className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 transition-colors cursor-pointer"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trigger Mail Modal */}
      {mailModalFlat && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Draft Payment Demand Notice</h3>
              </div>
              <button
                onClick={() => setMailModalFlat(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {mailSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{mailSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block">Recipient Customer</span>
                  <span className="font-semibold text-white">{mailModalFlat.customer?.name} ({mailModalFlat.customer?.email || 'email pending'})</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Unit & Tower</span>
                  <span className="font-semibold text-white">{mailModalFlat.unitNumber} - {mailModalFlat.building?.name || 'Main Tower'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Overdue Amount</span>
                  <span className="font-bold text-rose-400">
                    {formatINR(mailModalFlat.overdueAmount > 0 ? mailModalFlat.overdueAmount : mailModalFlat.outstanding)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Due Date</span>
                  <span className="font-semibold text-amber-400">
                    {mailModalFlat.nextDemand?.dueDate ? new Date(mailModalFlat.nextDemand.dueDate).toLocaleDateString('en-IN') : 'Immediate'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Subject</label>
                <input
                  type="text"
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Email Body (Editable Draft)</label>
                <textarea
                  rows={8}
                  value={mailBody}
                  onChange={(e) => setMailBody(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-sky-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-slate-500">
                  Clicking Send will trigger email notification and log to Email Logs.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMailModalFlat(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendMail}
                    disabled={sendingMail}
                    className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingMail ? 'Sending...' : 'Send Email'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View All Demands Modal */}
      {viewDemandsFlat && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>Demands Ledger - Unit {viewDemandsFlat.unitNumber}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Customer: {viewDemandsFlat.customer?.name || 'Unassigned'} • Agreement: {formatINR(viewDemandsFlat.agreementValue)}
                </p>
              </div>
              <button
                onClick={() => setViewDemandsFlat(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-x-auto max-h-[70vh]">
              {loadingDemands ? (
                <div className="p-8 text-center text-slate-400">Loading demand history...</div>
              ) : flatDemands.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No payment demands have been raised for this unit yet.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Demand #</th>
                      <th className="p-2.5">Milestone / Title</th>
                      <th className="p-2.5">Demand Amount</th>
                      <th className="p-2.5">Due Date</th>
                      <th className="p-2.5">Amount Paid</th>
                      <th className="p-2.5">Paid Date</th>
                      <th className="p-2.5">Balance</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {flatDemands.map((d: any) => {
                      const balance = (d.amount || 0) - (d.paidAmount || 0);
                      const isOverdue = d.status === 'OVERDUE';
                      return (
                        <tr key={d.id} className="hover:bg-slate-800/40">
                          <td className="p-2.5 font-mono font-bold text-sky-400">{d.demandNumber}</td>
                          <td className="p-2.5 text-slate-200">{d.milestoneName || d.notes || 'Construction Milestone'}</td>
                          <td className="p-2.5 font-semibold text-white">{formatINR(d.amount)}</td>
                          <td className="p-2.5 text-slate-400">{new Date(d.dueDate).toLocaleDateString('en-IN')}</td>
                          <td className="p-2.5 font-bold text-emerald-400">{formatINR(d.paidAmount)}</td>
                          <td className="p-2.5 text-slate-400">
                            {d.paidDate ? new Date(d.paidDate).toLocaleDateString('en-IN') : '-'}
                          </td>
                          <td className="p-2.5 font-semibold text-rose-300">{formatINR(balance > 0 ? balance : 0)}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              d.status === 'PAID'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : isOverdue
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setViewDemandsFlat(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-sm">Import Flat Inventory CSV</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {importResult && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{importResult}</span>
                </div>
              )}

              <p className="text-slate-300">
                Bulk upload real-estate units from external ERP or spreadsheet. The system will create building towers, assign unit configurations, and attach customer bookings automatically.
              </p>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadSampleCSVTemplate}
                  className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-medium border border-slate-700"
                >
                  Load Sample CSV
                </button>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  CSV Content (or Paste directly below)
                </label>
                <textarea
                  rows={8}
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  placeholder="unitNumber,tower,floorNumber,configuration,carpetArea,saleableArea,basePrice,agreementValue,status,customerName,customerEmail,customerPhone..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-sky-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Format: comma-separated values with header line
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCSVImport}
                    disabled={importing || !csvInput.trim()}
                    className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{importing ? 'Importing...' : 'Execute Import'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
