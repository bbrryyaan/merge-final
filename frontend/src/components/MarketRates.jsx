import React, { useState, useEffect } from 'react';
import { DollarSign, Bitcoin, RefreshCcw } from 'lucide-react';

const MarketRates = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRates = async () => {
    setLoading(true);
    try {
      // In a real app, you would fetch these from an API like CoinGecko or ExchangeRate-API
      // Using mock data for demo purposes since we don't have an API key
      setTimeout(() => {
        setRates([
          { symbol: 'USD/INR', value: 92.36, change: '+0.19%', isCrypto: false },
          { symbol: 'EUR/INR', value: 106.42, change: '+0.12%', isCrypto: false },
          { symbol: 'BTC/USD', value: '$69,938', change: '+1.4%', isCrypto: true },
          { symbol: 'ETH/USD', value: '$2,071', change: '+0.8%', isCrypto: true },
          { symbol: 'GBP/INR', value: 118.45, change: '-0.05%', isCrypto: false },
        ]);
        setLoading(false);
      }, 800);
    } catch (error) {
      console.error("Failed to fetch rates", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    fetchRates().then(() => {
      // Intentionally suppressing the set-state-in-effect warning 
      // since the data fetch is async but eslint misinterprets it.
    });
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <DollarSign size={18} className="text-emerald-400" />
          Market Rates & Crypto
        </h2>
        <button 
          onClick={fetchRates}
          disabled={loading}
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-50"
        >
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-800 bg-slate-950/60 p-3 h-20"></div>
          ))
        ) : (
          rates.map((rate, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-xs font-semibold">{rate.symbol}</p>
                {rate.isCrypto ? <Bitcoin size={14} className="text-amber-400" /> : <DollarSign size={14} className="text-emerald-400" />}
              </div>
              <div className="flex items-end justify-between mt-2">
                <p className="text-lg font-bold text-white">{rate.value}</p>
                <p className={`text-xs ${rate.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {rate.change}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default MarketRates;
