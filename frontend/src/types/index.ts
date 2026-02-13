export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  result?: AnalysisResult;
  timestamp: number;
}

export interface AnalysisResult {
  success: boolean;
  service?: string;
  question?: string;
  tier?: string;
  analysis?: string;
  complexity_level?: number;
  processing_time_ms?: number;
  model?: string;
  accuracy?: number;
  cost_paid?: string;
  qualityScore?: number;
  shouldCharge?: boolean;
  estimatedTokens?: number;
  tokenLimit?: number;
  timestamp?: string;
  error?: string;
}

export interface Transaction {
  id: string;
  tier: string;
  cost: number;
  status: 'charged' | 'free';
  quality: number;
  timestamp: number;
}

export interface DailyStats {
  totalSpent: number;
  requestsToday: number;
  chargedRequests: number;
  freeRequests: number;
  date: string;
}
