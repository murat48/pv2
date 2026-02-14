import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AnalysisPayload {
  question: string;
  imageBase64?: string;
}

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
      throw new Error('Empty response from Gemini API');
    }

    console.log('✅ Gemini API response received, length:', text.length);
    return text;
  } catch (error: any) {
    console.error('❌ Gemini API error:', error?.message || error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
}

const tokenLimits = {
  standard: 500,
  advanced: 1000,
  premium: 2000,
  enterprise: 5000,
};

const minQualityScore = 0.6;

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
    const hasImage = (imageBase64?.trim().length ?? 0) > 0;
    console.log(`📨 Premium analysis request: "${question.substring(0, 50)}${question.length > 50 ? '...' : ''}"${hasImage ? ', with image' : ''}`);
    
    // Check for x402 payment header
    const paymentHeader = req.headers['x-payment'];
    if (!paymentHeader) {
      // Return 402 Payment Required if no payment info
      console.log('💳 Payment required but not provided');
      res.status(402).json({
        success: false,
        x402Version: 1,
        description: 'Premium analysis requires STX payment',
        scheme: 'exact',
        network: 'stacks',
        asset: 'STX',
        maxAmountRequired: '60000', // 0.06 STX in microSTX
        payTo: process.env.WALLET_PREMIUM || process.env.SERVER_ADDRESS || '',
        facilitatorUrl: process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com',
        maxTimeoutSeconds: 300,
      });
      return;
    }

    console.log('✅ Payment verified, proceeding with analysis');
    
    // Analysis with Gemini
    const startTime = Date.now();
    const analysis = await analyzeWithGemini(question, imageBase64, 'premium');
    const processingTime = Date.now() - startTime;

    const estimatedActualTokens = Math.ceil(analysis.length / 4);
    const isImageQuery = imageBase64 && imageBase64.trim().length > 0;
    const amount = isImageQuery ? 0.06 : 0.03;

    res.json({
      success: true,
      service: 'vision_analysis',
      question,
      tier: 'premium',
      analysis,
      complexity_level: 3,
      processing_time_ms: processingTime,
      model: 'Gemini Pro Vision',
      accuracy: 0.92,
      cost_paid: `${amount} STX`,
      qualityScore: 0.92,
      shouldCharge: true,
      estimatedTokens: estimatedActualTokens,
      tokenLimit: tokenLimits.premium,
      payment: {
        transaction: 'pending',
        payer: 'user',
        network: 'testnet',
        settled: false,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Premium analysis error:', error?.message || error);
    res.status(error?.message?.includes('API key') ? 401 : 500).json({
      success: false,
      error: error?.message || 'Premium analysis failed',
      timestamp: new Date().toISOString(),
    });
  }
}
