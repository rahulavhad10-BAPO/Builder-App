import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import type { Flat } from '../types/index.js';
import {
  Search,
  Download,
  Eye,
  Building,
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

  const handleExportCSV = () => {
    const headers = ['Flat No', 'Tower', 'Floor', 'Config', 'Status', 'Customer', 'Agreement Value', 'Amount Paid', 'Outstanding', 'Overdue Amount', 'Last Demand', 'Next Demand'];
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
      f.lastDemand?.demandNumber || '',
      f.nextDemand?.demandNumber || '',
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
            placeholder="Search Unit #, Customer, Broker..."
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
                <th className="p-3">Payment Health</th>
                <th className="p-3">Last / Next Demand</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    Loading units...
                  </td>
                </tr>
              ) : flats.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-500">
                    No property units match the selected filters.
                  </td>
                </tr>
              ) : (
                flats.map((flat) => {
                  const isOverdue = flat.overdueAmount > 0;
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

                      {/* Payment Health */}
                      <td className="p-3">
                        {isOverdue ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Overdue {formatINR(flat.overdueAmount)}
                          </span>
                        ) : flat.amountPaid >= flat.agreementValue && flat.agreementValue > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                            100% Cleared
                          </span>
                        ) : flat.amountPaid > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                            In Progress
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] text-slate-500">
                            Unpaid
                          </span>
                        )}
                      </td>

                      {/* Last / Next Demand */}
                      <td className="p-3 text-[11px]">
                        {flat.lastDemand ? (
                          <div className="text-slate-300">
                            <span className="text-[10px] text-slate-500">Last: </span>
                            {flat.lastDemand.demandNumber} ({flat.lastDemand.status})
                          </div>
                        ) : null}
                        {flat.nextDemand ? (
                          <div className="text-sky-400 font-medium mt-0.5">
                            <span className="text-[10px] text-slate-500">Next: </span>
                            {flat.nextDemand.demandNumber} ({new Date(flat.nextDemand.dueDate).toLocaleDateString('en-IN')})
                          </div>
                        ) : null}
                      </td>

                      {/* Action */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenFlat360(flat.id)}
                            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Flat 360
                          </button>
                          {flat.customer && (
                            <button
                              onClick={() => onOpenRecordPayment(flat.id, flat.customer!.id)}
                              className="px-2 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors cursor-pointer"
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
    </div>
  );
};
