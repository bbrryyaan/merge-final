import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';

const NetBalancePrompt = () => {
  const [upiBalance, setUpiBalance] = useState('');
  const [cashBalance, setCashBalance] = useState('');
  const [savingsBalance, setSavingsBalance] = useState('');
  const { updateNetBalance } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateNetBalance(Number(upiBalance), Number(cashBalance), Number(savingsBalance));
    setUpiBalance('');
    setCashBalance('');
    setSavingsBalance('');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-black text-white mb-2">Initialize Balances</h2>
        <p className="text-slate-400 text-sm mb-6">Please provide your current balances to proceed.</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Net Balance (UPI / Bank)</label>
            <input
              type="number"
              value={upiBalance}
              onChange={(e) => setUpiBalance(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-4 text-slate-100 outline-none focus:border-cyan-500 transition-colors"
              placeholder="Enter UPI balance"
              required
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Cash Balance</label>
            <input
              type="number"
              value={cashBalance}
              onChange={(e) => setCashBalance(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-4 text-slate-100 outline-none focus:border-cyan-500 transition-colors"
              placeholder="Enter cash balance"
              required
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Savings Account Balance</label>
            <input
              type="number"
              value={savingsBalance}
              onChange={(e) => setSavingsBalance(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-4 text-slate-100 outline-none focus:border-cyan-500 transition-colors"
              placeholder="Enter savings balance"
              required
              min="0"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-cyan-600 text-white font-bold py-3 mt-2 rounded-xl hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-900/20"
          >
            Save Balances
          </button>
        </form>
      </div>
    </div>
  );
};

export default NetBalancePrompt;
