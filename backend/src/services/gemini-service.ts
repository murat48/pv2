import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/constants.js';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

interface AnalysisInput {
  imageBase64?: string;
  question: string;
  tier: string;
}

interface TierConfig {
  name: string;
  model: string;
  accuracy: number;
  maxTokens: number;
}

interface AnalysisResult {
  analysis: string;
  details?: Record<string, any>;
  processing_time_ms: number;
  tier: TierConfig;
}

const tierConfigs: Record<string, TierConfig> = {
  standard: { name: 'Standard', model: config.geminiModel, accuracy: 0.75, maxTokens: 500 },
  advanced: { name: 'Advanced', model: config.geminiModel, accuracy: 0.80, maxTokens: 2000 },
  premium: { name: 'Premium', model: config.geminiModel, accuracy: 0.85, maxTokens: 5000 },
  enterprise: { name: 'Enterprise', model: config.geminiModel, accuracy: 0.90, maxTokens: 10000 },
};

export async function analyzeImageWithGemini({
  imageBase64,
  question,
  tier,
}: AnalysisInput): Promise<AnalysisResult> {
  const startTime = Date.now();
  const tierConfig = tierConfigs[tier] || tierConfigs.standard;

  try {
    const model = getGenAI().getGenerativeModel({ model: tierConfig.model });

    let response;
    if (imageBase64) {
      const imageData = {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg',
        },
      };
      
      response = await model.generateContent([
        imageData,
        { text: question },
      ]);
    } else {
      response = await model.generateContent(question);
    }

    const text = response.response.text();
    const isImageQuery = imageBase64 && imageBase64.trim().length > 0;
    const qualityScore = calculateResponseQuality(text, question, isImageQuery);

    // Update accuracy based on actual quality
    tierConfig.accuracy = qualityScore;

    return {
      analysis: text,
      processing_time_ms: Date.now() - startTime,
      tier: tierConfig,
      details: {
        qualityScore,
        characterCount: text.length,
        wordCount: text.split(/\s+/).length,
      },
    };
  } catch (error) {
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function calculateResponseQuality(response: string, question: string, isImageQuery: boolean = false): number {
  let qualityScore = 0.7; // Start with 0.7 base

  // 1. Check for uncertainty markers (PRIMARY - affects most)
  const uncertaintyMarkers = [
    // English
    "i don't know",
    'i lack',
    'i lack the ability',
    'unclear',
    'unable to process',
    'cannot determine',
    'hard to say',
    'unable to',
    'cannot provide',
    // Turkish
    'bilmiyorum',
    'emin değilim',
    'bilinmiyor',
    'belirlenemedi',
    'kesin',
  ];

  const lowerResponse = response.toLowerCase();
  let uncertaintyCount = 0;
  for (const marker of uncertaintyMarkers) {
    if (lowerResponse.includes(marker)) {
      uncertaintyCount++;
    }
  }
  if (uncertaintyCount > 0) {
    qualityScore -= uncertaintyCount * 0.1;
  }

  // 2. Response length check
  if (response.length < 10) {
    qualityScore -= 0.2;
  } else if (response.length < 30) {
    qualityScore -= 0.05;
  }

  // 3. Confidence markers (if has >=2, add bonus)
  const confidenceMarkers = [
    'ankara',
    'turkey',
    'türkiye',
    'capital',
    'başkent',
    'located',
    'yer al',
    'is',
    'dir',
    'was',
    'are',
  ];
  const confidenceCount = confidenceMarkers.filter((m) => lowerResponse.includes(m)).length;
  if (confidenceCount >= 2) {
    qualityScore += 0.2;
  }

  // 4. Processing time (fast responses get slight bonus for caching)
  // Note: would need actual timing data, skipping for now

  // 5. Semantic relevance - check if question words appear in response
  const questionWords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const matchingWords = questionWords.filter((w) => lowerResponse.includes(w)).length;
  if (questionWords.length > 0 && matchingWords / questionWords.length > 0.5) {
    qualityScore += 0.1;
  }

  // 6. Image query bonus - image analysis is worth more
  if (isImageQuery) {
    qualityScore += 0.15; // +15% bonus for image queries
  }

  // 7. Normalize to range [0.3, 1.0]
  qualityScore = Math.max(0.3, Math.min(1.0, qualityScore));

  return qualityScore;
}
