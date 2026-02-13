import { useState, useEffect } from 'react';
import { Transaction, DailyStats } from '../types/index';

export default function AnalyticsDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [totalStats, setTotalStats] = useState({ spent: 0, requests: 0, chargedCount: 0 });

  const loadAnalytics = () => {
    // Load transactions
    const savedTransactions = JSON.parse(localStorage.getItem('analytics_transactions') || '[]');
    setTransactions(savedTransactions.slice(0, 20)); // Last 20

    // Load today's stats
    const today = new Date().toISOString().split('T')[0];
    const todayStats = JSON.parse(localStorage.getItem(`analytics_daily_${today}`) || '{}');
    setDailyStats(todayStats as DailyStats);

    // Calculate totals
    const totalSpent = savedTransactions.reduce((sum: number, t: Transaction) => sum + t.cost, 0);
    const chargedRequests = savedTransactions.filter((t: Transaction) => t.status === 'charged').length;
    setTotalStats({
      spent: totalSpent,
      requests: savedTransactions.length,
      chargedCount: chargedRequests,
    });
  };

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 'bg-red-900/30 text-red-100';
      case 'premium':
        return 'bg-yellow-900/30 text-yellow-100';
      case 'advanced':
        return 'bg-blue-900/30 text-blue-100';
      case 'standard':
        return 'bg-slate-700/30 text-slate-100';
      default:
        return 'bg-gray-700/30 text-gray-100';
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 shadow-2xl">
        <h1 className="text-2xl font-bold text-white">📊 Analytics Dashboard</h1>
        <p className="text-purple-100 text-sm mt-1">Real-time transaction and spending metrics</p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily Usage */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-2">Today's Requests</p>
            <p className="text-3xl font-bold text-white">
              {dailyStats?.requestsToday || 0}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Charged: {dailyStats?.chargedRequests || 0} •{' '}
              Free: {dailyStats?.freeRequests || 0}
            </p>
          </div>

          {/* Daily Spending */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-2">Daily Spent</p>
            <p className="text-3xl font-bold text-white">
              {(dailyStats?.totalSpent || 0).toFixed(4)} STX
            </p>
            <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((dailyStats?.totalSpent || 0) / 0.5) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Limit: 0.5 STX</p>
          </div>

          {/* All-Time Stats */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-2">All-Time</p>
            <p className="text-3xl font-bold text-white">
              {totalStats.spent.toFixed(4)} STX
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {totalStats.requests} requests • {totalStats.chargedCount} paid
            </p>
          </div>
        </div>

        {/* Quality Distribution */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-4">Quality Distribution</h3>
          <div className="space-y-2">
            {[
              { label: 'Excellent (90-100%)', min: 90, color: 'bg-green-500' },
              { label: 'Good (80-89%)', min: 80, max: 89, color: 'bg-blue-500' },
              { label: 'Average (70-79%)', min: 70, max: 79, color: 'bg-yellow-500' },
              { label: 'Low (<70%)', max: 69, color: 'bg-red-500' },
            ].map((range) => {
              const count = transactions.filter(
                (t) =>
                  (range.max === undefined || t.quality <= range.max) &&
                  (range.min === undefined || t.quality >= range.min),
              ).length;
              const percentage = transactions.length > 0 ? (count / transactions.length) * 100 : 0;
              return (
                <div key={range.label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-400">{range.label}</span>
                    <span className="text-sm font-semibold text-white">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`${range.color} h-2 rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-4">Recent Transactions</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No transactions yet</p>
            ) : (
              transactions.map((t) => (
                <div
                  key={t.id}
                  className={`flex justify-between items-center p-3 rounded border border-slate-700 ${getTierColor(
                    t.tier,
                  )}`}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm capitalize">{t.tier}</p>
                    <p className="text-xs text-gray-400">
                      Quality: {t.quality}% • Time:{' '}
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">
                      {t.status === 'charged' ? '✅' : '💚'} {t.cost.toFixed(4)} STX
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
