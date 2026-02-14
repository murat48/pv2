import type { VercelRequest, VercelResponse } from '@vercel/node';

interface AnalyzeInfoPayload {
  question: string;
  imageBase64?: string;
}

function detectComplexity(question: string, hasImage: boolean): number {
  const lowerQuestion = question.toLowerCase();
  const wordCount = question.split(/\s+/).length;

  // Enterprise (complexity = 4)
  if (
    wordCount > 30 ||
    /complex|advanced analysis|multiple perspectives|enterprise|strategic/i.test(lowerQuestion)
  ) {
    return 4;
  }

  // Premium (complexity = 3)
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

  // Advanced (complexity = 2)
  if (wordCount > 15) {
    return 2;
  }
  if (/detail|more|information|about|tell|show/i.test(lowerQuestion)) {
    return 2;
  }

  // Standard (complexity = 1)
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

function estimateCost(tier: string): number {
  const costs: Record<string, number> = {
    standard: 0,
    advanced: 0.02,
    premium: 0.06,
    enterprise: 0.1,
  };
  return costs[tier] || 0;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { question, imageBase64 } = req.body as AnalyzeInfoPayload;

  if (!question) {
    res.status(400).json({ error: 'Missing question' });
    return;
  }

  const hasImage = !!imageBase64;
  const complexity = detectComplexity(question, hasImage);
  const selectedTier = mapComplexityToTier(complexity);
  const estimatedCost = estimateCost(selectedTier);

  res.status(200).json({
    success: true,
    complexity,
    selectedTier,
    estimatedCost,
    hasSampleImage: hasImage,
  });
}
