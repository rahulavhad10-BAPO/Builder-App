import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Package,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  Edit2,
  X,
} from 'lucide-react';

interface MaterialInventoryViewProps {
  projectId: string;
  initialFilters?: any;
}

export const MaterialInventoryView: React.FC<MaterialInventoryViewProps> = ({
  projectId,
  initialFilters,
}) => {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(!!initialFilters?.lowStock);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Warehouse Transaction Modal
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [txType, setTxType] = useState<string>('RECEIPT');
  const [txQty, setTxQty] = useState<string>('');
  const [txRef, setTxRef] = useState<string>('');
  const [txModalOpen, setTxModalOpen] = useState<boolean>(false);

  // Threshold Edit Modal (Admin only)
  const [thresholdModalItem, setThresholdModalItem] = useState<any | null>(null);
  const [newMinStock, setNewMinStock] = useState<number>(0);
  const [newReorderLevel, setNewReorderLevel] = useState<number>(0);
  const [savingThreshold, setSavingThreshold] = useState<boolean>(false);

  // PO Generation Modal
  const [poModalItem, setPoModalItem] = useState<any | null>(null);
  const [poVendorId, setPoVendorId] = useState<string>('');
  const [poRequiredQty, setPoRequiredQty] = useState<string>('');
  const [poUnitPrice, setPoUnitPrice] = useState<string>('');
  const [poDeliveryDate, setPoDeliveryDate] = useState<string>('');
  const [generatingPO, setGeneratingPO] = useState<boolean>(false);
  const [generatedPoResult, setGeneratedPoResult] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const [data, vendorList] = await Promise.all([
        ApiClient.getInventoryItems({ lowStockOnly }),
        ApiClient.getVendors(),
      ]);
      setItems(data);
      setVendors(vendorList);
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
      setFeedback(`Recorded ${txType} of ${txQty} ${selectedItem.unit} for ${selectedItem.name}.`);
      setTxModalOpen(false);
      setTxQty('');
      await loadItems();
    } catch (err: any) {
      alert(err.message || 'Transaction failed');
    }
  };

  const openThresholdEdit = (item: any) => {
    if (!isAdmin) {
      alert('Threshold configuration is restricted to Admin roles only.');
      return;
    }
    setThresholdModalItem(item);
    setNewMinStock(item.minStock);
    setNewReorderLevel(item.reorderLevel);
  };

  const handleSaveThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thresholdModalItem) return;
    setSavingThreshold(true);
    try {
      await ApiClient.updateInventoryThreshold(
        thresholdModalItem.id,
        Number(newMinStock),
        Number(newReorderLevel)
      );
      setFeedback(`Updated stock thresholds for ${thresholdModalItem.name}: Min ${newMinStock}, Reorder ${newReorderLevel}`);
      setThresholdModalItem(null);
      await loadItems();
    } catch (err: any) {
      alert(err.message || 'Failed to update threshold');
    } finally {
      setSavingThreshold(false);
    }
  };

  const openGeneratePO = (item: any) => {
    setPoModalItem(item);
    setGeneratedPoResult(null);
    setPoVendorId(vendors[0]?.id || '');
    // Default required quantity to restore optimal stock level
    const defReq = Math.max(0, (item.reorderLevel * 2) - item.currentStock);
    setPoRequiredQty(String(defReq > 0 ? defReq : item.reorderLevel));
    setPoUnitPrice('100');
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
    setPoDeliveryDate(inTwoWeeks.toISOString().split('T')[0]);
  };

  const handleGeneratePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poModalItem || !poVendorId) return;
    setGeneratingPO(true);
    try {
      const qty = Number(poRequiredQty);
      const unitPrice = Number(poUnitPrice);
      const totalAmount = qty * unitPrice;

      const res = await ApiClient.createPO({
        projectId: projectId || undefined,
        vendorId: poVendorId,
        deliveryDate: poDeliveryDate ? new Date(poDeliveryDate).toISOString() : new Date().toISOString(),
        items: [
          {
            materialName: poModalItem.name,
            quantity: qty,
            unitPrice: unitPrice,
            totalPrice: totalAmount,
          },
        ],
        notes: `Replenishment PO generated for item ${poModalItem.itemCode} (Available: ${poModalItem.currentStock} ${poModalItem.unit})`,
      });

      setGeneratedPoResult(`Purchase Order generated successfully! PO Number: ${res.poNumber}. It is now pending Admin approval.`);
      await loadItems();
      setTimeout(() => {
        setPoModalItem(null);
        setGeneratedPoResult(null);
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to generate PO');
    } finally {
      setGeneratingPO(false);
    }
  };

  const calcTotalCost = () => {
    const q = Number(poRequiredQty) || 0;
    const p = Number(poUnitPrice) || 0;
    return q * p;
  };

  const formatINR = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

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
            <p className="text-xs text-slate-400">
              Real-time stock balance, automated low stock highlighting, threshold management & PO generation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
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
          <button onClick={() => setFeedback(null)} className="text-emerald-400 hover:text-white cursor-pointer">✕</button>
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
                <th className="p-3 text-right">Actions</th>
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
                items.map((item) => {
                  const isCritical = item.isCritical || item.currentStock <= item.minStock;
                  const isLow = !isCritical && (item.isLowStock || item.currentStock <= item.reorderLevel);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isCritical
                          ? 'bg-rose-950/20 border-l-4 border-l-rose-500 hover:bg-rose-950/30'
                          : isLow
                          ? 'bg-amber-950/20 border-l-4 border-l-amber-500 hover:bg-amber-950/30'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-sky-400">{item.itemCode}</td>
                      <td className="p-3 font-semibold text-white">
                        <div>{item.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Unit: {item.unit}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-white text-sm">
                        <span className={isCritical ? 'text-rose-400' : isLow ? 'text-amber-300' : 'text-emerald-400'}>
                          {item.currentStock.toLocaleString()}
                        </span>{' '}
                        <span className="text-[11px] text-slate-400 font-normal">{item.unit}</span>
                      </td>

                      {/* Reorder Threshold with Admin Edit */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-mono text-slate-300">
                          <span>{item.reorderLevel.toLocaleString()} {item.unit}</span>
                          {isAdmin && (
                            <button
                              onClick={() => openThresholdEdit(item)}
                              title="Admin: Edit Reorder Threshold"
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-400 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Safety Min Stock with Admin Edit */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-mono text-slate-300">
                          <span>{item.minStock.toLocaleString()} {item.unit}</span>
                          {isAdmin && (
                            <button
                              onClick={() => openThresholdEdit(item)}
                              title="Admin: Edit Safety Min Stock"
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-400 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-slate-300">{item.location}</td>

                      {/* Health Status Badge */}
                      <td className="p-3">
                        {isCritical ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>CRITICAL LOW</span>
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>REORDER DUE</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                            Optimal
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Generate PO Button */}
                          <button
                            onClick={() => openGeneratePO(item)}
                            title="Generate Replenishment PO"
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                              isCritical || isLow
                                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-sky-400'
                            }`}
                          >
                            <FilePlus2 className="w-3.5 h-3.5" />
                            <span>Generate PO</span>
                          </button>

                          {/* Record Tx */}
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setTxModalOpen(true);
                            }}
                            title="Post Warehouse Transaction"
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Transact</span>
                          </button>
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

      {/* PO Generation Modal */}
      {poModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FilePlus2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Generate Purchase Order (PO)</h3>
              </div>
              <button onClick={() => setPoModalItem(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {generatedPoResult && (
              <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{generatedPoResult}</span>
              </div>
            )}

            {/* Read-only Material Details */}
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800 grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 block">Material</span>
                <span className="font-bold text-white">{poModalItem.name} ({poModalItem.itemCode})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Available Quantity</span>
                <span className="font-mono font-bold text-sky-400 text-sm">
                  {poModalItem.currentStock.toLocaleString()} {poModalItem.unit}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Reorder Threshold</span>
                <span className="font-mono text-slate-300">
                  {poModalItem.reorderLevel.toLocaleString()} {poModalItem.unit}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Safety Min Stock</span>
                <span className="font-mono text-slate-300">
                  {poModalItem.minStock.toLocaleString()} {poModalItem.unit}
                </span>
              </div>
            </div>

            <form onSubmit={handleGeneratePO} className="space-y-3">
              {/* Select Vendor */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Registered Vendor *</label>
                <select
                  required
                  value={poVendorId}
                  onChange={(e) => setPoVendorId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Choose Vendor --</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.code}) - Rating: {v.rating}★
                    </option>
                  ))}
                </select>
              </div>

              {/* Required Quantity & Price Per Item */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Required Quantity ({poModalItem.unit}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={poRequiredQty}
                    onChange={(e) => setPoRequiredQty(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Price per Unit (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={poUnitPrice}
                    onChange={(e) => setPoUnitPrice(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Delivery Date */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Target Delivery Date</label>
                <input
                  type="date"
                  value={poDeliveryDate}
                  onChange={(e) => setPoDeliveryDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Auto-Calculated Total Cost */}
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-400 block font-medium">Auto-Calculated Total Cost</span>
                  <span className="text-slate-400 text-[10px]">
                    {poRequiredQty || 0} {poModalItem.unit} × ₹{poUnitPrice || 0}
                  </span>
                </div>
                <div className="text-base font-bold text-emerald-300 font-mono">
                  {formatINR(calcTotalCost())}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPoModalItem(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generatingPO || !poVendorId}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold cursor-pointer shadow-md"
                >
                  {generatingPO ? 'Generating PO...' : 'Trigger PO for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Threshold Edit Modal */}
      {thresholdModalItem && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Configure Stock Thresholds (Admin)</h3>
              <button onClick={() => setThresholdModalItem(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span className="text-slate-400 block">Item:</span>
              <span className="font-bold text-white">{thresholdModalItem.name} ({thresholdModalItem.itemCode})</span>
            </div>

            <form onSubmit={handleSaveThreshold} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Safety Minimum Stock ({thresholdModalItem.unit})
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newMinStock}
                  onChange={(e) => setNewMinStock(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Reorder Threshold Level ({thresholdModalItem.unit})
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newReorderLevel}
                  onChange={(e) => setNewReorderLevel(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setThresholdModalItem(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingThreshold}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer"
                >
                  {savingThreshold ? 'Saving...' : 'Update Thresholds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Transaction Modal */}
      {txModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Post Warehouse Transaction</h3>
              <button onClick={() => setTxModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
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
                  onClick={() => setTxModalOpen(false)}
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
