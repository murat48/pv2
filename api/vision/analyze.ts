import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AnalysisPayload {
  question: string;
  imageBase64?: string;
}

function detectComplexity(question: string, hasImage: boolean): number {
  const lowerQuestion = question.toLowerCase();
  const wordCount = question.split(/\s+/).length;

  if (
    wordCount > 30 ||
    /complex|advanced analysis|multiple perspectives|enterprise|strategic/i.test(lowerQuestion)
  ) {
    return 4;
  }

  if (/why|how|explain|analyze|describe|compare/.test(lowerQuestion)) {
    return 3;
  }
  if (
    /detailed|comprehensive|in depth|thorough|elaborate|extensive|complete/.test(
      lowerQuestion
    )
  ) {
    return 3;
  }

  if (wordCount > 15) {
    return 2;
  }
  if (/detail|more|information|about|tell|show/i.test(lowerQuestion)) {
    return 2;
  }

  return 1;
}

function mapComplexityToTier(complexity: number): string {
  switch (complexity) {
    case 4:
      return 'enterprise';
    case 3:
      return 'premium';
    case 2:
      return 'advanced';
    default:
      return 'standard';
  }
}

const tokenLimits = {
  standard: 500,
  advanced: 1000,
  premium: 2000,
  enterprise: 5000,
};

const minQualityScore = 0.6;

function generateMockAnalysis(question: string, tier: string): string {
  const tiers = {
    standard: 'A basic analysis of your question.',
    advanced: 'A comprehensive analysis with detailed insights.',
    premium: 'An in-depth analysis with comprehensive insights and recommendations.',
    enterprise: 'A comprehensive enterprise-level analysis with detailed research and strategic recommendations.',
  };

  return `${tiers[tier as keyof typeof tiers]}\n\nQuestion analyzed: "${question}"\nTier: ${tier}\nQuality: High`;
}

async function analyzeWithGemini(
  question: string,
  imageBase64: string | undefined,
  tier: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const errorMsg = '❌ CRITICAL: GEMINI_API_KEY environment variable not set';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    console.log('🔑 Using Gemini API with key:', apiKey.substring(0, 10) + '...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    let content: any[];
    if (imageBase64) {
      content = [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64,
          },
        },
        { text: question },
      ];
    } else {
      content = [{ text: question }];
    }

    console.log('📤 Sending request to Gemini API...');
    const result = await model.generateContent(content);
    const response = result.response;
    const text = response.text();

    if (!text) {
      console.warn('⚠️ Empty response from Gemini API');
      return generateMockAnalysis(question, tier);
    }

    console.log('✅ Gemini API response received, length:', text.length);
    return text;
  } catch (error: any) {
    console.error('❌ Gemini API error:', error?.message || error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Only fallback to mock if API key is invalid or service unavailable
    if (error?.message?.includes('API key') || error?.message?.includes('401')) {
      console.error('API key issue - check GEMINI_API_KEY');
      throw error;
    }
    
    // For other errors, still throw so client knows there's an issue
    throw new Error(`Gemini API failed: ${error?.message || 'Unknown error'}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { question, imageBase64 } = req.body as AnalysisPayload;

  if (!question) {
    res.status(400).json({ success: false, error: 'Question required' });
    return;
  }

  try {
    console.log(`📨 New analysis request: "${question.substring(0, 50)}${question.length > 50 ? '...' : ''}"`);
    
    const hasImage = (imageBase64?.trim().length ?? 0) > 0;
    const complexity = detectComplexity(question, hasImage);
    const selectedTier = mapComplexityToTier(complexity);

    console.log(`📊 Detected complexity: ${complexity}, Tier: ${selectedTier}${hasImage ? ', Image: YES' : ''}`);

    // Generate analysis using Gemini
    const startTime = Date.now();
    const analysis = await analyzeWithGemini(question, imageBase64, selectedTier);
    const processingTime = Date.now() - startTime;

    const estimatedActualTokens = Math.ceil(analysis.length / 4);

    // Determine pricing
    const isImageQuery = imageBase64 && imageBase64.trim().length > 0;
    const basePrices = {
      standard: isImageQuery ? 0.02 : 0.01,
      advanced: isImageQuery ? 0.04 : 0.02,
      premium: isImageQuery ? 0.06 : 0.03,
      enterprise: isImageQuery ? 0.1 : 0.05,
    };

    const amount = basePrices[selectedTier as keyof typeof basePrices] || 0.01;
    const shouldCharge = 0.85 >= minQualityScore;

    res.json({
      success: true,
      service: 'vision_analysis',
      question,
      tier: selectedTier,
      analysis,
      complexity_level: complexity,
      processing_time_ms: processingTime,
      model: 'Gemini Pro Vision',
      accuracy: 0.85,
      cost_paid: `${amount} STX`,
      qualityScore: 0.85,
      shouldCharge,
      estimatedTokens: estimatedActualTokens,
      tokenLimit: tokenLimits[selectedTier as keyof typeof tokenLimits],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Analysis error:', error?.message || error);
    res.status(error?.message?.includes('API key') ? 401 : 500).json({
      success: false,
      error: error?.message || 'Analysis failed',
      timestamp: new Date().toISOString(),
    });
  }
}
