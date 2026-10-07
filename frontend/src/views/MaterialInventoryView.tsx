import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import { Package, PlusCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface MaterialInventoryViewProps {
  projectId: string;
  initialFilters?: any;
}

export const MaterialInventoryView: React.FC<MaterialInventoryViewProps> = ({
  projectId,
  initialFilters,
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(!!initialFilters?.lowStock);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [txType, setTxType] = useState<string>('RECEIPT');
  const [txQty, setTxQty] = useState<string>('');
  const [txRef, setTxRef] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getInventoryItems({ lowStockOnly });
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [lowStockOnly]);

  const handleRecordTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !txQty) return;
    try {
      await ApiClient.recordInventoryTx({
        itemId: selectedItem.id,
        projectId: projectId || selectedItem.transactions?.[0]?.projectId || 'default',
        type: txType,
        quantity: Number(txQty),
        reference: txRef,
      });
      setFeedback(`Successfully recorded ${txType} of ${txQty} ${selectedItem.unit} for ${selectedItem.name}.`);
      setModalOpen(false);
      setTxQty('');
      await loadItems();
    } catch (err: any) {
      alert(err.message || 'Transaction failed');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Material Inventory Master</h2>
            <p className="text-xs text-slate-400">Real-time stock balance calculated dynamically from warehouse transactions</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
            />
            <span>Filter Low Stock & Reorder Alerts</span>
          </label>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Item Code</th>
                <th className="p-3">Material Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Current Stock</th>
                <th className="p-3">Reorder Threshold</th>
                <th className="p-3">Safety Min Stock</th>
                <th className="p-3">Storage Location</th>
                <th className="p-3">Health Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">Loading material catalog...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">No inventory items found.</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-sky-400">{item.itemCode}</td>
                    <td className="p-3 font-semibold text-white">{item.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-white text-sm">
                      {item.currentStock.toLocaleString()} <span className="text-[11px] text-slate-400 font-normal">{item.unit}</span>
                    </td>
                    <td className="p-3 text-slate-400 font-mono">{item.reorderLevel.toLocaleString()} {item.unit}</td>
                    <td className="p-3 text-slate-400 font-mono">{item.minStock.toLocaleString()} {item.unit}</td>
                    <td className="p-3 text-slate-300">{item.location}</td>
                    <td className="p-3">
                      {item.isCritical ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-max">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Critical Low</span>
                        </span>
                      ) : item.isLowStock ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Reorder Due
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                          Optimal
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold text-xs transition-colors ml-auto cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Transact</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Transaction Modal */}
      {modalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Post Warehouse Transaction</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div>
              <div className="text-slate-400">Material Item:</div>
              <div className="font-bold text-white text-sm">{selectedItem.name} ({selectedItem.itemCode})</div>
              <div className="text-slate-400 mt-1">Current Stock: <span className="text-emerald-400 font-bold">{selectedItem.currentStock} {selectedItem.unit}</span></div>
            </div>
            <form onSubmit={handleRecordTx} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Transaction Type</label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="RECEIPT">Material Receipt (GRN)</option>
                  <option value="ISSUE">Site Issue to Contractor</option>
                  <option value="ADJUSTMENT">Stock Audit Adjustment</option>
                  <option value="TRANSFER">Inter-Tower Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Quantity ({selectedItem.unit}) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={txQty}
                  onChange={(e) => setTxQty(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Document Reference (PO #, GRN #)</label>
                <input
                  type="text"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  placeholder="e.g. GRN-2024-889"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer"
                >
                  Post Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
