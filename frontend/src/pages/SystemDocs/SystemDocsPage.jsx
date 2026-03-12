import React from 'react';
import { ShieldCheck, Cpu, Database, Calculator, AlertTriangle, Sparkles, TrendingUp } from 'lucide-react';

const SystemDocsPage = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <ShieldCheck size={32} className="text-indigo-400" />
          System Transparency & Logic
        </h1>
        <p className="text-slate-400 mt-2 max-w-2xl">
          We believe in financial clarity. This document outlines the mathematical models, AI logic processing, and data architectural choices that power Pocket Genie.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* The Math Section */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Calculator size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Computation Logic</h2>
          </div>
          
          <div className="space-y-6">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
               <p className="text-xs font-black text-cyan-400 uppercase tracking-tighter mb-2">Safe to Spend (Today)</p>
               <div className="bg-slate-900 px-3 py-2 rounded-lg font-mono text-sm text-slate-300 mb-2">
                 DailySafe = (RemainingBudget) / (DaysRemaining)
               </div>
               <p className="text-xs text-slate-500 italic">This is a dynamic rolling average. It resets every morning precisely at 00:00 local time.</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
               <p className="text-xs font-black text-cyan-400 uppercase tracking-tighter mb-2">Savings Rate</p>
               <div className="bg-slate-900 px-3 py-2 rounded-lg font-mono text-sm text-slate-300 mb-2">
                 Rate = (NetBalance / TotalIncome) * 100
               </div>
               <p className="text-xs text-slate-500 italic">Target student rate: 15-20%. Anything below 5% triggers the 'Red-Alert' AI insight.</p>
            </div>
          </div>
        </section>

        {/* The AI Engine Section */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400">
              <Sparkles size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Gemini-2.5 AI Brain</h2>
          </div>

          <div className="space-y-4">
             <div className="border-l-2 border-fuchsia-500/30 pl-4 space-y-2">
                <p className="text-white font-bold text-sm">Affordability Analysis</p>
                <p className="text-xs text-slate-400">Our LLM doesn't just check balance; it performs a 'Stress Test'. It simulates the purchase impact against your 30-day run-rate. If a purchase reduces your goal success probability by &gt;10%, it suggests 'Park in Radar'.</p>
             </div>
             <div className="border-l-2 border-fuchsia-500/30 pl-4 space-y-2">
                <p className="text-white font-bold text-sm">Contextual Roasting</p>
                <p className="text-xs text-slate-400">To maintain accountability, the AI uses 'High-Engagement' personas. It uses the Indian Student context (Mess vs Dining Out) to humanize abstract financial data.</p>
             </div>
          </div>
        </section>

        {/* Data Architecture */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 lg:col-span-2">
           <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
               <Database size={20} />
             </div>
             <h2 className="text-xl font-bold text-white">System Architecture & Privacy</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                 <Cpu size={24} className="text-slate-500 mb-3" />
                 <h4 className="text-white font-bold text-sm mb-2">Dual Data Modes</h4>
                 <p className="text-[11px] text-slate-500 leading-relaxed">
                   **Demo Mode**: Uses memory-isolated synthetic data. Excellent for testing without risking privacy.
                   **Normal Mode**: Real-time MongoDB persistence with JWT-secured authentication.
                 </p>
              </div>
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                 <AlertTriangle size={24} className="text-slate-500 mb-3" />
                 <h4 className="text-white font-bold text-sm mb-2">Budget Guardrails</h4>
                 <p className="text-[11px] text-slate-500 leading-relaxed">
                   The system implements **Fixed-Cap Arithmetic**. Once a budget is set, all 'Safe to Spend' metrics are tethered to that hard limit, preventing the 'mental accounting' bias.
                 </p>
              </div>
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                 <TrendingUp size={24} className="text-slate-500 mb-3" />
                 <h4 className="text-white font-bold text-sm mb-2">Projection Engine</h4>
                 <p className="text-[11px] text-slate-500 leading-relaxed">
                   Our Future Simulator uses a **Linear Growth Model with Compounding**. It assumes a conservative 8% annual return on savings unless adjusted by the user.
                 </p>
              </div>
           </div>
        </section>
      </div>

      <footer className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center">
         <p className="text-slate-500 text-xs">
           Version 1.0.4 - Student Pocket Genie Core Engine. Built for transparency.
         </p>
      </footer>
    </div>
  );
};

export default SystemDocsPage;
