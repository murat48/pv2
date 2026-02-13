import { useState } from 'react';
import SmartVisionBot from './components/SmartVisionBot';
import AnalyticsDashboard from './components/AnalyticsDashboard';

type TabType = 'vision' | 'analytics';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('vision');

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-700 bg-slate-900/80 backdrop-blur">
        <button
          onClick={() => setActiveTab('vision')}
          className={`flex-1 py-3 px-4 font-semibold transition ${
            activeTab === 'vision'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          🔮 Vision
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-3 px-4 font-semibold transition ${
            activeTab === 'analytics'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          📊 Analytics
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'vision' && <SmartVisionBot />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
      </div>
    </div>
  );
}

export default App;
