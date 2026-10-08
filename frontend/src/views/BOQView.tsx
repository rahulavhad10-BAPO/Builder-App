import React, { useEffect, useState, useMemo } from 'react';
import { ApiClient } from '../api/client.js';
import { Calculator, Calendar, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

interface BOQViewProps {
  projectId: string;
}

export const BOQView: React.FC<BOQViewProps> = ({ projectId }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedQuarter, setSelectedQuarter] = useState<'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('ALL');

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

  // Quarterly aggregated simulation across the 4 fiscal quarters
  const quarterlyData = useMemo(() => {
    return [
      { quarter: 'Q1 (Apr-Jun)', planned: 12500000, actual: 11800000, variance: -700000 },
      { quarter: 'Q2 (Jul-Sep)', planned: 18000000, actual: 19400000, variance: 1400000 },
      { quarter: 'Q3 (Oct-Dec)', planned: 22000000, actual: 21500000, variance: -500000 },
      { quarter: 'Q4 (Jan-Mar)', planned: 16500000, actual: 17200000, variance: 700000 },
    ];
  }, []);

  // Filter or scale line items based on chosen quarter
  const displayedItems = useMemo(() => {
    const factorMap: Record<string, { plannedFactor: number; actualFactor: number }> = {
      ALL: { plannedFactor: 1.0, actualFactor: 1.0 },
      Q1: { plannedFactor: 0.2, actualFactor: 0.2 },
      Q2: { plannedFactor: 0.3, actualFactor: 0.32 },
      Q3: { plannedFactor: 0.3, actualFactor: 0.28 },
      Q4: { plannedFactor: 0.2, actualFactor: 0.2 },
    };

    const factor = factorMap[selectedQuarter];
    return items.map((item) => {
      const plannedQ = Math.round(item.plannedQuantity * factor.plannedFactor);
      const actualQ = Math.round(item.consumedQuantity * factor.actualFactor);
      const plannedCost = Math.round(item.amount * factor.plannedFactor);
      const actualCost = Math.round(actualQ * item.rate);
      const costVariance = actualCost - plannedCost;
      const qtyVariance = actualQ - plannedQ;

      return {
        ...item,
        quarterPlannedQty: plannedQ,
        quarterActualQty: actualQ,
        quarterPlannedCost: plannedCost,
        quarterActualCost: actualCost,
        quarterCostVariance: costVariance,
        quarterQtyVariance: qtyVariance,
      };
    });
  }, [items, selectedQuarter]);

  const summary = useMemo(() => {
    const planned = displayedItems.reduce((acc, i) => acc + (i.quarterPlannedCost || 0), 0);
    const actual = displayedItems.reduce((acc, i) => acc + (i.quarterActualCost || 0), 0);
    const variance = actual - planned;
    const efficiency = planned > 0 ? Math.round((actual / planned) * 100) : 100;
    return { planned, actual, variance, efficiency };
  }, [displayedItems]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Bill of Quantities (BOQ) - Planned vs Actual</h2>
            <p className="text-xs text-slate-400">
              Quarterly performance tracking, material burn-rate & cost variance monitoring
            </p>
          </div>
        </div>

        {/* Quarter Selectors */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {(['ALL', 'Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
            <button
              key={q}
              onClick={() => setSelectedQuarter(q)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                selectedQuarter === q ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {q === 'ALL' ? 'Full Fiscal Year' : q}
            </button>
          ))}
        </div>
      </div>

      {/* Quarterly KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>Planned Budget ({selectedQuarter})</span>
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {formatINR(summary.planned)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Actual Spend ({selectedQuarter})</span>
          </div>
          <div className="text-lg font-bold text-emerald-300 mt-1">
            {formatINR(summary.actual)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Cost Variance</span>
          </div>
          <div className={`text-lg font-bold mt-1 ${summary.variance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {summary.variance > 0 ? `+${formatINR(summary.variance)}` : formatINR(summary.variance)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Budget Utilization</span>
          </div>
          <div className="text-lg font-bold text-indigo-300 mt-1">
            {summary.efficiency}%
          </div>
        </div>
      </div>

      {/* Quarterly Planned vs Actual Recharts Graph */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <span>Quarterly Planned vs Actual Budget Variance (FY 2025-26)</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">Amounts in INR (Crores)</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={quarterlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="quarter" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `₹${(v / 10000000).toFixed(1)}Cr`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                formatter={(val: any) => formatINR(Number(val))}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
              <Bar dataKey="planned" fill="#38bdf8" name="Planned Budget" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill="#10b981" name="Actual Spend" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Item Code</th>
                <th className="p-3">Description</th>
                <th className="p-3">Contractor</th>
                <th className="p-3">Unit Rate</th>
                <th className="p-3">{selectedQuarter} Planned Qty</th>
                <th className="p-3">{selectedQuarter} Planned Budget</th>
                <th className="p-3">{selectedQuarter} Actual Qty</th>
                <th className="p-3">{selectedQuarter} Actual Spend</th>
                <th className="p-3">Quantity Variance</th>
                <th className="p-3">Cost Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">Loading BOQ schedule...</td>
                </tr>
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">No BOQ items registered.</td>
                </tr>
              ) : (
                displayedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-sky-400">{item.itemCode}</td>
                    <td className="p-3 font-semibold text-white max-w-xs">{item.description}</td>
                    <td className="p-3 text-slate-300">{item.contractor?.name || 'Apex Civil Works'}</td>
                    <td className="p-3 text-slate-400">{formatINR(item.rate)}</td>
                    <td className="p-3 font-mono text-slate-300">{item.quarterPlannedQty} {item.unit}</td>
                    <td className="p-3 font-bold text-white">{formatINR(item.quarterPlannedCost)}</td>
                    <td className="p-3 font-bold text-emerald-400">{item.quarterActualQty} {item.unit}</td>
                    <td className="p-3 font-bold text-white">{formatINR(item.quarterActualCost)}</td>
                    <td className="p-3 font-mono">
                      <span className={item.quarterQtyVariance > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {item.quarterQtyVariance > 0 ? `+${item.quarterQtyVariance}` : item.quarterQtyVariance} {item.unit}
                      </span>
                    </td>
                    <td className="p-3 font-bold font-mono">
                      <span className={item.quarterCostVariance > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {item.quarterCostVariance > 0 ? `+${formatINR(item.quarterCostVariance)}` : formatINR(item.quarterCostVariance)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
