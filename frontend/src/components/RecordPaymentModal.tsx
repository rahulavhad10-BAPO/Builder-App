import React, { useState } from 'react';
import { ApiClient } from '../api/client.js';
import { X, CreditCard, CheckCircle } from 'lucide-react';

interface RecordPaymentModalProps {
  flatId: string | null;
  customerId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  flatId,
  customerId,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('NEFT');
  const [transactionRef, setTransactionRef] = useState<string>(`TXN-${Date.now().toString().slice(-6)}`);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!flatId || !customerId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Please specify a valid payment amount');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await ApiClient.recordPayment({
        flatId,
        customerId,
        amount: Number(amount),
        paymentMode,
        transactionRef,
        paymentDate,
        notes,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Payment recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white">Record Customer Payment</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Amount (₹ INR) *</label>
            <input
              type="number"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500000"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
              >
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="NET_BANKING">Net Banking</option>
                <option value="DEMAND_DRAFT">Demand Draft</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Transaction / UTR Reference *</label>
            <input
              type="text"
              required
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Accounting Notes / Remarks</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional payment notes..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{submitting ? 'Recording...' : 'Confirm Receipt'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
