import { Router, Request, Response } from 'express';
import { paymentMiddleware, getPayment, STXtoMicroSTX } from 'x402-stacks';
import { analyzeImageWithGemini } from '../services/gemini-service.js';
import { config } from '../config/constants.js';
import {
  calculatePaymentAmount,
  buildPaymentConfig,
  shouldChargeForResponse,
  formatSTXAmount,
} from '../services/payment-service.js';

const router = Router();

// X402 Protocol Type Definitions
type FieldDef = {
  type: string;
  required?: boolean;
  description?: string;
  enum?: string[];
};

type OutputSchema = {
  input: {
    type: "request";
    method: "GET" | "POST";
    pathParams?: Record<string, FieldDef>;
    queryParams?: Record<string, FieldDef>;
    headerFields?: Record<string, FieldDef>;
    bodyFields?: Record<string, FieldDef>;
    bodyType?: "json" | "form-data";
  };
  output: Record<string, any>;
};

type Accepts = {
  scheme: "exact";
  network: "stacks";
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: "STX" | "USDCx" | "sBTC";
  outputSchema: OutputSchema;
};

type x402RegisterResponse = {
  x402Version: number;
  name: string;
  image?: string;
  accepts: Accepts[];
};

// X402 Registration endpoint
router.get('/register', (req: Request, res: Response) => {
  // Load environment variables at request time to ensure they're available
  const NETWORK = (process.env.NETWORK as 'mainnet' | 'testnet') || 'testnet';
  const SERVER_ADDRESS = process.env.SERVER_ADDRESS || process.env.WALLET_PREMIUM || '';
  const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com';
  const SERVICE_NAME = process.env.SERVICE_NAME || 'Vision AI Analysis Service';
  const SERVICE_IMAGE = process.env.SERVICE_IMAGE || 'https://pv2-six.vercel.app/vision-logo.png';
  const baseUrl = process.env.BASE_URL || 'https://pv2-six.vercel.app';
  
  const response: x402RegisterResponse = {
    x402Version: 2,
    name: SERVICE_NAME,
    image: SERVICE_IMAGE,
    accepts: [
      // Standard/Advanced Analysis - Low cost
      {
        scheme: 'exact',
        network: 'stacks',
        maxAmountRequired: STXtoMicroSTX(0.04).toString(), // 0.04 STX = 40000 microSTX
        resource: `${baseUrl}/vision/analyze`,
        description: 'Standard/Advanced Vision AI Analysis (text or image)',
        mimeType: 'application/json',
        payTo: SERVER_ADDRESS,
        maxTimeoutSeconds: 300,
        asset: 'STX',
        outputSchema: {
          input: {
            type: 'request',
            method: 'POST',
            bodyType: 'json',
            bodyFields: {
              question: {
                type: 'string',
                required: true,
                description: 'Question or prompt for analysis',
              },
              imageBase64: {
                type: 'string',
                required: false,
                description: 'Base64 encoded image (optional)',
              },
            },
          },
          output: {
            success: { type: 'boolean' },
            service: { type: 'string' },
            question: { type: 'string' },
            tier: { type: 'string' },
            analysis: { type: 'string' },
            complexity_level: { type: 'number' },
            processing_time_ms: { type: 'number' },
            model: { type: 'string' },
            accuracy: { type: 'number' },
            cost_paid: { type: 'string' },
            qualityScore: { type: 'number' },
            shouldCharge: { type: 'boolean' },
            estimatedTokens: { type: 'number' },
            tokenLimit: { type: 'number' },
            timestamp: { type: 'string' },
          },
        },
      },
      // Premium Analysis - Medium cost with payment
      {
        scheme: 'exact',
        network: 'stacks',
        maxAmountRequired: STXtoMicroSTX(0.06).toString(), // 0.06 STX = 60000 microSTX
        resource: `${baseUrl}/vision/analyze-premium`,
        description: 'Premium Vision AI Analysis with guaranteed response',
        mimeType: 'application/json',
        payTo: SERVER_ADDRESS,
        maxTimeoutSeconds: 300,
        asset: 'STX',
        outputSchema: {
          input: {
            type: 'request',
            method: 'POST',
            bodyType: 'json',
            bodyFields: {
              question: {
                type: 'string',
                required: true,
                description: 'Question or prompt for analysis',
              },
              imageBase64: {
                type: 'string',
                required: false,
                description: 'Base64 encoded image (optional)',
              },
            },
          },
          output: {
            success: { type: 'boolean' },
            service: { type: 'string' },
            question: { type: 'string' },
            tier: { type: 'string' },
            analysis: { type: 'string' },
            complexity_level: { type: 'number' },
            processing_time_ms: { type: 'number' },
            model: { type: 'string' },
            accuracy: { type: 'number' },
            cost_paid: { type: 'string' },
            qualityScore: { type: 'number' },
            shouldCharge: { type: 'boolean' },
            estimatedTokens: { type: 'number' },
            tokenLimit: { type: 'number' },
            payment: {
              type: 'object',
              properties: {
                transaction: { type: 'string' },
                payer: { type: 'string' },
                network: { type: 'string' },
                settled: { type: 'boolean' },
              },
            },
            timestamp: { type: 'string' },
          },
        },
      },
      // Enterprise Analysis - High cost with sBTC
      {
        scheme: 'exact',
        network: 'stacks',
        maxAmountRequired: '10000', // 0.0001 sBTC = 10000 satoshi
        resource: `${baseUrl}/vision/analyze-enterprise`,
        description: 'Enterprise Vision AI Analysis with maximum capabilities',
        mimeType: 'application/json',
        payTo: SERVER_ADDRESS,
        maxTimeoutSeconds: 300,
        asset: 'sBTC',
        outputSchema: {
          input: {
            type: 'request',
            method: 'POST',
            bodyType: 'json',
            bodyFields: {
              question: {
                type: 'string',
                required: true,
                description: 'Complex question or analysis request',
              },
              imageBase64: {
                type: 'string',
                required: false,
                description: 'Base64 encoded image (optional)',
              },
            },
          },
          output: {
            success: { type: 'boolean' },
            service: { type: 'string' },
            question: { type: 'string' },
            tier: { type: 'string' },
            analysis: { type: 'string' },
            complexity_level: { type: 'number' },
            processing_time_ms: { type: 'number' },
            model: { type: 'string' },
            accuracy: { type: 'number' },
            cost_paid: { type: 'string' },
            payment: {
              type: 'object',
              properties: {
                asset: { type: 'string' },
                transaction: { type: 'string' },
                payer: { type: 'string' },
                network: { type: 'string' },
              },
            },
            timestamp: { type: 'string' },
          },
        },
      },
    ],
  };

  res.json(response);
});

interface AnalyzeInfoPayload {
  question: string;
  imageBase64?: string;
}

interface AnalysisPayload extends AnalyzeInfoPayload {}

// Complexity detection - determines initial tier placement
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

// POST /vision/analyze-info - Analyze and return tier info WITHOUT processing yet
router.post('/analyze-info', async (req: Request, res: Response) => {
  try {
    const { question, imageBase64 } = req.body as AnalyzeInfoPayload;

    if (!question) {
      return res.status(400).json({ success: false, error: 'Question required' });
    }

    const hasImage = (imageBase64?.trim().length ?? 0) > 0;
    const complexity = detectComplexity(question, hasImage);
    const selectedTier = mapComplexityToTier(complexity);

    return res.json({
      success: true,
      selectedTier,
      complexity,
      hasImage,
      estimatedCost: hasImage
        ? config.prices[selectedTier as keyof typeof config.prices].image
        : config.prices[selectedTier as keyof typeof config.prices].text,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Analysis info failed',
    });
  }
});

// POST /vision/analyze - Process and return full analysis with payment info
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { question, imageBase64 } = req.body as AnalysisPayload;

    if (!question) {
      return res.status(400).json({ success: false, error: 'Question required' });
    }

    const hasImage = (imageBase64?.trim().length ?? 0) > 0;
    const complexity = detectComplexity(question, hasImage);
    const selectedTier = mapComplexityToTier(complexity);

    // Generate analysis
    try {
      const analysis = await analyzeImageWithGemini({
        imageBase64,
        question,
        tier: selectedTier,
      });

      // Calculate tokens
      const estimatedActualTokens = Math.ceil(analysis.analysis.length / 4);

      // Determine pricing
      const isImageQuery = imageBase64 && imageBase64.trim().length > 0;
      const basePrices = {
        standard: isImageQuery ? 0.02 : 0.01,
        advanced: isImageQuery ? 0.04 : 0.02,
        premium: isImageQuery ? 0.06 : 0.03,
        enterprise: isImageQuery ? 0.1 : 0.05,
      };

      const amount = basePrices[selectedTier as keyof typeof basePrices] || 0.01;

      // Payment condition: quality-based only (no token limit check)
      const shouldCharge = analysis.tier.accuracy >= config.minQualityScore;

      return res.json({
        success: true,
        service: 'vision_analysis',
        question,
        tier: selectedTier,
        analysis: analysis.analysis,
        complexity_level: complexity,
        processing_time_ms: analysis.processing_time_ms,
        model: analysis.tier.model,
        accuracy: analysis.tier.accuracy,
        cost_paid: `${amount} STX`,
        qualityScore: analysis.tier.accuracy,
        shouldCharge,
        estimatedTokens: estimatedActualTokens,
        tokenLimit: config.tokenLimits[selectedTier as keyof typeof config.tokenLimits],
        timestamp: new Date().toISOString(),
      });
    } catch (geminiError: any) {
      return res.status(500).json({
        success: false,
        error: `Gemini API: ${geminiError.message || 'API call failed'}`,
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Analysis failed',
    });
  }
});

// POST /vision/analyze-premium - Premium analysis with STX payment requirement
// This endpoint requires STX payment via x402-stacks for premium/enterprise queries
router.post('/analyze-premium', (req: Request, res: Response, next: any) => {
  // Create payment middleware dynamically with current environment variables
  const paymentConfig = {
    amount: STXtoMicroSTX(0.06), // 0.06 STX = 60000 microSTX
    payTo: process.env.WALLET_PREMIUM || process.env.SERVER_ADDRESS || '',
    network: (process.env.NETWORK as 'mainnet' | 'testnet') || 'testnet',
    facilitatorUrl: process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com',
    asset: 'STX' as const,
    description: 'Vision AI - Premium Analysis with Image',
    maxTimeoutSeconds: 300,
  };

  const middleware = paymentMiddleware(paymentConfig);
  middleware(req, res, async () => {
    try {
      // Get verified payment details from middleware
      const payment = getPayment(req);

      const { question, imageBase64 } = req.body as AnalysisPayload;

      if (!question) {
        return res.status(400).json({ success: false, error: 'Question required' });
      }

      const hasImage = (imageBase64?.trim().length ?? 0) > 0;
      const complexity = detectComplexity(question, hasImage);
      const selectedTier = mapComplexityToTier(complexity);

      // Generate analysis
      try {
        const analysis = await analyzeImageWithGemini({
          imageBase64,
          question,
          tier: selectedTier,
        });

        // Calculate tokens
        const estimatedActualTokens = Math.ceil(analysis.analysis.length / 4);

        // Determine pricing
        const amount = calculatePaymentAmount(
          selectedTier as 'standard' | 'advanced' | 'premium' | 'enterprise',
          hasImage
        );

        return res.json({
          success: true,
          service: 'vision_analysis_premium',
          question,
          tier: selectedTier,
          analysis: analysis.analysis,
          complexity_level: complexity,
          processing_time_ms: analysis.processing_time_ms,
          model: analysis.tier.model,
          accuracy: analysis.tier.accuracy,
          cost_paid: formatSTXAmount(amount),
          qualityScore: analysis.tier.accuracy,
          shouldCharge: true,
          estimatedTokens: estimatedActualTokens,
          tokenLimit: config.tokenLimits[selectedTier as keyof typeof config.tokenLimits],
          // Payment information
          payment: {
            transaction: payment?.transaction,
            payer: payment?.payer,
            network: payment?.network,
            settled: true,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (geminiError: any) {
        return res.status(500).json({
          success: false,
          error: `Gemini API: ${geminiError.message || 'API call failed'}`,
          payment: {
            transaction: payment?.transaction,
            status: 'completed',
          },
        });
      }
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Premium analysis failed',
      });
    }
  });
});

// POST /vision/analyze-enterprise - Enterprise analysis with sBTC payment requirement
// This endpoint requires sBTC payment via x402-stacks for maximum capabilities
router.post('/analyze-enterprise', (req: Request, res: Response, next: any) => {
  // Create payment middleware dynamically with current environment variables
  const paymentConfig = {
    amount:STXtoMicroSTX(0.06), // 0.0001 sBTC = 10000 satoshi
    payTo: process.env.WALLET_ENTERPRISE || process.env.SERVER_ADDRESS || '',
    network: (process.env.NETWORK as 'mainnet' | 'testnet') || 'testnet',
    facilitatorUrl: process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com',
    asset: 'sBTC' as const,
    description: 'Vision AI - Enterprise Analysis with Maximum Capabilities',
    maxTimeoutSeconds: 300,
  };

  const middleware = paymentMiddleware(paymentConfig);
  middleware(req, res, async () => {
    try {
      // Get verified payment details from middleware
      const payment = getPayment(req);

      const { question, imageBase64 } = req.body as AnalysisPayload;

      if (!question) {
        return res.status(400).json({ success: false, error: 'Question required' });
      }

      const hasImage = (imageBase64?.trim().length ?? 0) > 0;
      // Force enterprise tier for this endpoint
      const selectedTier = 'enterprise';

      // Generate analysis
      try {
        const analysis = await analyzeImageWithGemini({
          imageBase64,
          question,
          tier: selectedTier,
        });

        return res.json({
          success: true,
          service: 'vision_analysis_enterprise',
          question,
          tier: selectedTier,
          analysis: analysis.analysis,
          complexity_level: 4,
          processing_time_ms: analysis.processing_time_ms,
          model: analysis.tier.model,
          accuracy: analysis.tier.accuracy,
          cost_paid: '0.0001 sBTC',
          // Payment information
          payment: {
            asset: 'sBTC',
            transaction: payment?.transaction,
            payer: payment?.payer,
            network: payment?.network,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (geminiError: any) {
        return res.status(500).json({
          success: false,
          error: `Gemini API: ${geminiError.message || 'API call failed'}`,
          payment: {
            asset: 'sBTC',
            transaction: payment?.transaction,
            status: 'completed',
          },
        });
      }
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Enterprise analysis failed',
      });
    }
  });
});

// POST /vision/get-payment-details - Get payment details for a query
// Useful for frontend to show payment info before initiating payment
router.post('/get-payment-details', async (req: Request, res: Response) => {
  try {
    const { tier, hasImage } = req.body;

    if (!tier || !['standard', 'advanced', 'premium', 'enterprise'].includes(tier)) {
      return res.status(400).json({ success: false, error: 'Valid tier required' });
    }

    const amount = calculatePaymentAmount(
      tier as 'standard' | 'advanced' | 'premium' | 'enterprise',
      hasImage || false
    );

    const network = process.env.NETWORK || 'testnet';
    const facilitatorUrl = process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com';
    const serverAddress = process.env.SERVER_ADDRESS || '';

    return res.json({
      success: true,
      tier,
      hasImage: hasImage || false,
      amount: amount,
      formattedAmount: formatSTXAmount(amount),
      microSTX: STXtoMicroSTX(amount).toString(),
      payTo: serverAddress,
      network,
      facilitatorUrl,
      description: `Vision AI Analysis - ${tier.toUpperCase()} Tier${hasImage ? ' (with image)' : ''}`,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get payment details',
    });
  }
});

export { router };

