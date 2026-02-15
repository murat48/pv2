import type { VercelRequest, VercelResponse } from '@vercel/node';
import { STXtoMicroSTX } from 'x402-stacks';

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

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers ekle
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-payment');

  // OPTIONS (CORS preflight) isteğini karşıla
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Load environment variables at request time
  const NETWORK = (process.env.NETWORK as 'mainnet' | 'testnet') || 'testnet';
  const SERVER_ADDRESS = process.env.SERVER_ADDRESS || process.env.WALLET_PREMIUM || 'ST2TTX11Z4QSF59TSJ7ES86H9BDXEY2Z0N8JARNF2';
  const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com';
  const SERVICE_NAME = process.env.SERVICE_NAME || 'Vision AI Analysis Service';
  const SERVICE_IMAGE = process.env.SERVICE_IMAGE || 'https://pv2-six.vercel.app/vision-logo.png';
  const baseUrl = process.env.BASE_URL || 'https://pv2-six.vercel.app';

  const response: x402RegisterResponse = {
    x402Version: 2,
    name: SERVICE_NAME,
    image: SERVICE_IMAGE,
    accepts: [
      // Standard/Advanced Analysis - Free
      {
        scheme: 'exact',
        network: 'stacks',
        maxAmountRequired: STXtoMicroSTX(0.04).toString(),
        resource: `${baseUrl}/api/vision/analyze`,
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
      // Premium Analysis - Free
      {
        scheme: 'exact',
        network: 'stacks',
        maxAmountRequired: STXtoMicroSTX(0.06).toString(),
        resource: `${baseUrl}/api/vision/analyze-premium`,
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
            displayedCost: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
      // Enterprise Analysis - Free
      {
        scheme: 'exact',
        network: 'stacks',
        maxAmountRequired: STXtoMicroSTX(0.1).toString(),
        resource: `${baseUrl}/api/vision/analyze-enterprise`,
        description: 'Enterprise Vision AI Analysis with maximum capabilities',
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
            displayedCost: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    ],
  };

  res.status(200).json(response);
}
