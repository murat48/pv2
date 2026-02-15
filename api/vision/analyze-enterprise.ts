import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AnalysisPayload {
  question: string;
  imageBase64?: string;
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
    throw error;
  }
}

const tokenLimits = {
  enterprise: 5000,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers ekle
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-payment');

  // OPTIONS (CORS preflight) isteğini karşıla
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    console.log(`📨 Enterprise analysis request: "${question.substring(0, 50)}${question.length > 50 ? '...' : ''}"${hasImage ? ', with image' : ''}`);
    
    // All requests are free - no payment check needed
    
    // Analysis with Gemini
    const startTime = Date.now();
    const analysis = await analyzeWithGemini(question, imageBase64, 'enterprise');
    const processingTime = Date.now() - startTime;

    const estimatedActualTokens = Math.ceil(analysis.length / 4);
    const isImageQuery = imageBase64 && imageBase64.trim().length > 0;
    const amount = isImageQuery ? 0.1 : 0.05;

    res.json({
      success: true,
      service: 'vision_analysis_enterprise',
      question,
      tier: 'enterprise',
      analysis,
      complexity_level: 4,
      processing_time_ms: processingTime,
      model: 'Gemini 2.0 Flash',
      accuracy: 0.95,
      cost_paid: `${amount} STX`,
      qualityScore: 0.95,
      shouldCharge: false,
      displayedCost: `${amount} STX`,
      estimatedTokens: estimatedActualTokens,
      tokenLimit: tokenLimits.enterprise,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Enterprise analysis error:', error?.message || error);
    res.status(error?.message?.includes('API key') ? 401 : 500).json({
      success: false,
      error: error?.message || 'Enterprise analysis failed',
      timestamp: new Date().toISOString(),
    });
  }
}
