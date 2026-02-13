import { useState, useEffect } from 'react';

export default function WalletSettings() {
  const [limits, setLimits] = useState({
    dailyLimit: 0.5,
    perRequestLimit: 0.1,
    totalSpentToday: 0,
  });

  useEffect(() => {
    const saved = localStorage.getItem('spending_limits');
    if (saved) setLimits(JSON.parse(saved));
  }, []);

  const handleSave = () => {
    localStorage.setItem('spending_limits', JSON.stringify(limits));
    alert('✅ Spending limits updated');
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-white">⚙️ Spending Limits</h2>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-300">Daily Limit (STX)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={limits.dailyLimit}
            onChange={(e) => setLimits({ ...limits, dailyLimit: parseFloat(e.target.value) })}
            className="w-full mt-1 p-2 bg-slate-700 text-white rounded border border-slate-600"
          />
          <p className="text-xs text-gray-400 mt-1">Maximum you can spend in 24 hours</p>
        </div>

        <div>
          <label className="text-sm text-gray-300">Per-Request Limit (STX)</label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={limits.perRequestLimit}
            onChange={(e) => setLimits({ ...limits, perRequestLimit: parseFloat(e.target.value) })}
            className="w-full mt-1 p-2 bg-slate-700 text-white rounded border border-slate-600"
          />
          <p className="text-xs text-gray-400 mt-1">Maximum single request cost</p>
        </div>

        <div>
          <label className="text-sm text-gray-300">Today's Spend (STX)</label>
          <div className="w-full mt-1 p-2 bg-slate-700 text-white rounded border border-slate-600">
            {limits.totalSpentToday.toFixed(6)}
          </div>
          <p className="text-xs text-gray-400 mt-1">Resets at midnight UTC</p>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold transition"
      >
        Save Limits
      </button>

      <hr className="border-slate-700 my-4" />

      <div className="text-xs text-gray-400 space-y-2">
        <h3 className="font-semibold text-gray-300">Pricing Tiers</h3>
        <div className="space-y-1 text-xs">
          <p>📄 <strong>Standard:</strong> 0.01 STX (text), 0.02 STX (image)</p>
          <p>🎯 <strong>Advanced:</strong> 0.02 STX (text), 0.04 STX (image)</p>
          <p>⭐ <strong>Premium:</strong> 0.03 STX (text), 0.06 STX (image)</p>
          <p>💎 <strong>Enterprise:</strong> 0.05 STX (text), 0.10 STX (image)</p>
        </div>
      </div>
    </div>
  );
}
