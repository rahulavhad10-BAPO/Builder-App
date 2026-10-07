import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client.js';
import { Calculator } from 'lucide-react';

interface BOQViewProps {
  projectId: string;
}

export const BOQView: React.FC<BOQViewProps> = ({ projectId }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadBOQ = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getBOQ({ projectId: projectId || undefined });
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBOQ();
  }, [projectId]);

  const formatINR = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Bill of Quantities (BOQ) Variance Engine</h2>
            <p className="text-xs text-slate-400">Planned vs Consumed material and labour budget variance</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Item Code</th>
                <th className="p-3">Description</th>
                <th className="p-3">Contractor</th>
                <th className="p-3">Planned Qty</th>
                <th className="p-3">Unit Rate</th>
                <th className="p-3">Budget Amount</th>
                <th className="p-3">Consumed Qty</th>
                <th className="p-3">Remaining</th>
                <th className="p-3">Progress %</th>
                <th className="p-3">Quantity Variance</th>
                <th className="p-3">Cost Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">Loading BOQ schedule...</td>
                </tr>
              ) : items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono font-bold text-sky-400">{item.itemCode}</td>
                  <td className="p-3 font-semibold text-white max-w-xs">{item.description}</td>
                  <td className="p-3 text-slate-300">{item.contractor?.name || 'In-house'}</td>
                  <td className="p-3 font-mono text-slate-300">{item.plannedQuantity} {item.unit}</td>
                  <td className="p-3 text-slate-400">{formatINR(item.rate)}</td>
                  <td className="p-3 font-bold text-white">{formatINR(item.amount)}</td>
                  <td className="p-3 font-bold text-emerald-400">{item.consumedQuantity} {item.unit}</td>
                  <td className="p-3 text-slate-400">{item.remainingQuantity} {item.unit}</td>
                  <td className="p-3">
                    <div className="w-16 bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-sky-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, item.consumedPercentage)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{item.consumedPercentage}%</span>
                  </td>
                  <td className="p-3 font-mono">
                    <span className={item.quantityVariance > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                      {item.quantityVariance > 0 ? `+${item.quantityVariance}` : item.quantityVariance} {item.unit}
                    </span>
                  </td>
                  <td className="p-3 font-bold font-mono">
                    <span className={item.costVariance > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                      {item.costVariance > 0 ? `+${formatINR(item.costVariance)}` : formatINR(item.costVariance)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
