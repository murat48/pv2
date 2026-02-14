import { useState, useRef, useEffect } from 'react';
import { ChatMessage, AnalysisResult, Transaction, DailyStats } from '../types/index';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? 'http://localhost:3003' : 'http://localhost:3003');

interface PaymentDetails {
  success: boolean;
  tier: string;
  amount: number;
  formattedAmount: string;
  microSTX: string;
  payTo: string;
  network: string;
  facilitatorUrl: string;
  description: string;
}

export default function SmartVisionBot() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('chat_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [question, setQuestion] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<{ tier: string; cost: number } | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<any>(null);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-save messages to localStorage
  useEffect(() => {
    localStorage.setItem('chat_messages', JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setImagePreview(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const getImageBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    });
  };

  const getPaymentDetails = async (
    tier: string,
    hasImage: boolean
  ): Promise<PaymentDetails | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/vision/get-payment-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, hasImage }),
      });

      if (!response.ok) {
        throw new Error('Failed to get payment details');
      }

      return await response.json();
    } catch (err) {
      console.error('Error getting payment details:', err);
      return null;
    }
  };

  const handleAnalyze = async () => {
    if (!question.trim()) {
      setError('Please ask a question');
      return;
    }

    setLoading(true);
    setError('');
    setPaymentStatus('');

    try {
      const payload = {
        question,
        imageBase64: imageFile ? await getImageBase64(imageFile) : undefined,
      };

      // Step 1: Analyze info (get tier estimate)
      const infoResponse = await fetch(`${API_BASE_URL}/vision/analyze-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!infoResponse.ok) {
        throw new Error('Failed to get tier information');
      }

      const tierInfo = await infoResponse.json();

      // Step 2: Show confirmation if Premium/Enterprise
      if (tierInfo.selectedTier === 'premium' || tierInfo.selectedTier === 'enterprise') {
        // Get payment details for this tier
        const hasImage = payload.imageBase64 ? true : false;
        const paymentDeets = await getPaymentDetails(tierInfo.selectedTier, hasImage);

        setPaymentDetails(paymentDeets);
        setEstimatedCost({
          tier: tierInfo.selectedTier,
          cost: tierInfo.estimatedCost,
        });
        setPendingAnalysis(payload);
        setShowConfirmation(true);
        setLoading(false);
        return;
      }

      // Step 3: Proceed with analysis (Standard/Advanced auto-approve)
      proceedWithAnalysis(payload);
    } catch (err: any) {
      setError(err.message || 'Error analyzing question');
      setLoading(false);
    }
  };

  const proceedWithAnalysis = async (payload: any, isPremium: boolean = false) => {
    try {
      const endpoint = isPremium ? '/vision/analyze-premium' : '/vision/analyze';
      
      setPaymentStatus(isPremium ? '⏳ Processing premium analysis with payment...' : '⏳ Processing analysis...');

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Handle 402 Payment Required (for premium endpoint)
      if (response.status === 402) {
        const paymentRequired = await response.json();
        console.log('Payment required:', paymentRequired);
        setError('Payment required to proceed. Please complete the payment through x402.');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const analysisResult: AnalysisResult = await response.json();

      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'Analysis failed');
      }

      // Record transaction
      const shouldCharge = analysisResult.shouldCharge ?? false;
      const costAmount = parseFloat(analysisResult.cost_paid?.replace(' STX', '') || '0');
      const transaction: Transaction = {
        id: Date.now().toString(),
        tier: analysisResult.tier || 'standard',
        cost: shouldCharge ? costAmount : 0,
        status: shouldCharge ? 'charged' : 'free',
        quality: Math.round((analysisResult.accuracy || 0) * 100),
        timestamp: Date.now(),
      };

      // Save transaction
      const existingTransactions = JSON.parse(localStorage.getItem('analytics_transactions') || '[]');
      localStorage.setItem('analytics_transactions', JSON.stringify([transaction, ...existingTransactions].slice(0, 100)));

      // Update daily stats
      const today = new Date().toISOString().split('T')[0];
      const dailyStats: DailyStats = JSON.parse(localStorage.getItem(`analytics_daily_${today}`) || '{}') || {
        totalSpent: 0,
        requestsToday: 0,
        chargedRequests: 0,
        freeRequests: 0,
        date: today,
      };

      dailyStats.requestsToday += 1;
      if (shouldCharge) {
        dailyStats.totalSpent += transaction.cost;
        dailyStats.chargedRequests += 1;
      } else {
        dailyStats.freeRequests += 1;
      }
      localStorage.setItem(`analytics_daily_${today}`, JSON.stringify(dailyStats));

      // Add message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: question,
        image: imagePreview || undefined,
        timestamp: Date.now(),
      };

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: analysisResult.analysis || '',
        result: analysisResult,
        timestamp: Date.now() + 1000,
      };

      setMessages((prev) => [...prev, userMessage, botMessage]);
      setQuestion('');
      setImageFile(null);
      setImagePreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowConfirmation(false);
      setPendingAnalysis(null);
      setPaymentStatus('');
      setPaymentDetails(null);
    } catch (err: any) {
      setError(err.message || 'Error during analysis');
    } finally {
      setLoading(false);
      setPaymentInProgress(false);
    }
  };

  const handleConfirmAnalysis = () => {
    if (pendingAnalysis) {
      // For premium/enterprise queries, proceed with premium endpoint
      // The x402-stacks library will handle the payment flow through the browser
      proceedWithAnalysis(pendingAnalysis, true);
    }
  };

  const handleCancelAnalysis = () => {
    setShowConfirmation(false);
    setPendingAnalysis(null);
    setLoading(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-slate-900 via-blue-900/20 to-slate-950">
      {/* Modern Header */}
      <div className="relative overflow-hidden border-b border-blue-500/20 perspective">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 blur-3xl"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-[0.03]"></div>
        
        <div className="relative px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="text-4xl">✨</div>
                <div>
                  <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Smart Vision Bot
                  </h1>
                  <p className="text-sm text-blue-200/70 mt-1">AI-powered Intelligence with Dynamic Pricing</p>
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>Status: <span className="text-green-400 font-semibold">● Online</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">✨</div>
              <h2 className="text-2xl font-bold text-white mb-2">Start Your Conversation</h2>
              <p className="text-gray-400 max-w-md">
                Ask questions, upload images, and get intelligent AI responses with dynamic STX pricing
              </p>
              <div className="mt-6 flex gap-2 justify-center text-sm">
                <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded-full text-blue-300">💬 Questions</span>
                <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full text-purple-300">📸 Images</span>
                <span className="px-3 py-1 bg-pink-500/20 border border-pink-500/50 rounded-full text-pink-300">💰 Smart Pricing</span>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div
              className={`max-w-2xl px-5 py-4 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none'
                  : 'bg-gradient-to-br from-slate-700 to-slate-800 text-gray-100 rounded-bl-none border border-slate-600/50'
              }`}
            >
              {msg.role === 'user' && (
                <div className="space-y-3">
                  {msg.image && (
                    <img src={msg.image} alt="user" className="max-w-sm rounded-xl shadow-md" />
                  )}
                  <p className="text-base leading-relaxed">{msg.content}</p>
                </div>
              )}
              {msg.role === 'assistant' && msg.result && (
                <div className="space-y-3">
                  <p className="text-base leading-relaxed">{msg.content}</p>
                  <div className="bg-black/20 rounded-lg p-3 space-y-2 border border-white/10">
                    <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                      <div>
                        <p className="text-gray-400">Quality</p>
                        <p className="text-green-300">{Math.round((msg.result.accuracy || 0) * 100)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Tier</p>
                        <p className="text-blue-300 uppercase">{msg.result.tier}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Cost</p>
                        <p className={msg.result.shouldCharge ? 'text-orange-300' : 'text-green-300'}>
                          {msg.result.shouldCharge ? '✓ Paid' : '✓ Free'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-blue-500/20 p-6 bg-gradient-to-t from-slate-900/80 to-slate-900/40 backdrop-blur-xl space-y-4">
        {error && (
          <div className="bg-gradient-to-r from-red-900/40 to-red-800/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm flex items-center gap-3 animate-pulse">
            <span className="text-xl">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {showConfirmation && estimatedCost && (
          <div
            className={`border rounded-xl p-4 space-y-3 ${
              estimatedCost.tier === 'premium'
                ? 'bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border-yellow-500/50'
                : 'bg-gradient-to-br from-red-900/30 to-red-800/20 border-red-500/50'
            }`}
          >
            <div>
              <p className="font-bold text-lg">
                {estimatedCost.tier === 'premium' ? '⭐ Premium Query' : '🔴 Enterprise Query'}
              </p>
              <p className="text-sm opacity-90 mt-1">
                Estimated cost: <span className="font-semibold">{estimatedCost.cost.toFixed(4)} STX</span>
                {pendingAnalysis?.imageBase64 ? ' (with image)' : ' (text only)'}
              </p>
              {paymentDetails && (
                <div className="mt-3 p-2 bg-black/30 rounded text-xs space-y-1">
                  <p><span className="text-gray-400">Network:</span> <span className="text-blue-300">{paymentDetails.network}</span></p>
                  <p><span className="text-gray-400">Facilitator:</span> <span className="text-blue-300 truncate">{paymentDetails.facilitatorUrl}</span></p>
                </div>
              )}
            </div>
            {paymentInProgress && (
              <div className="text-center py-2 bg-blue-900/30 rounded-lg">
                <p className="text-sm text-blue-300 font-semibold">{paymentStatus}</p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmAnalysis}
                disabled={loading || paymentInProgress}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg text-sm font-bold transition-all duration-200 transform hover:scale-105 disabled:scale-100"
              >
                {loading || paymentInProgress ? '⏳ Processing...' : '💰 Pay & Analyze'}
              </button>
              <button
                onClick={handleCancelAnalysis}
                disabled={loading || paymentInProgress}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-all"
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleAnalyze();
                }
              }}
              placeholder="Ask me anything... Add an image for visual Q&A (Ctrl+Enter to send)"
              className="w-full p-4 bg-slate-800 border border-slate-700 text-white rounded-xl placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 resize-none h-24 transition-all duration-200"
            />
          </div>

          {imagePreview && (
            <div className="relative inline-block group">
              <img src={imagePreview} alt="preview" className="max-h-40 rounded-xl shadow-lg border border-blue-500/50" />
              <button
                onClick={() => {
                  setImageFile(null);
                  setImagePreview('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-lg transition-all transform hover:scale-110"
              >
                ✕
              </button>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <span className="text-white text-xs font-semibold">Click X to remove</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center gap-2 shadow-lg"
            >
              <span>📸</span>
              <span>Add Image</span>
            </button>
            <button
              onClick={handleAnalyze}
              disabled={loading || !question.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-bold transition-all duration-200 transform hover:scale-105 disabled:scale-100 shadow-lg flex items-center justify-center gap-2"
            >
              <span>{loading ? '⏳' : '🚀'}</span>
              <span>{loading ? 'Analyzing...' : 'Analyze & Respond'}</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
