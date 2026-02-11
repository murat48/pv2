import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { paymentMiddleware, getPayment, STXtoMicroSTX } from 'x402-stacks';

const NETWORK = (process.env.NETWORK as 'mainnet' | 'testnet') || 'testnet';
const SERVER_ADDRESS = process.env.SERVER_ADDRESS!;
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Premium Service';
const SERVICE_IMAGE = process.env.SERVICE_IMAGE || 'https://your-api.com/logo.png';

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

const app = express();
app.use(express.json());

// X402 Registration endpoint
app.get(['/register', '/api/register'], (req: Request, res: Response) => {
  const response: x402RegisterResponse = {
    x402Version: 2,
    name: SERVICE_NAME,
    image: SERVICE_IMAGE,
    accepts: [
      // STX - Demo endpoint
      {
        scheme: 'exact',
        network: 'stacks',
        maxAmountRequired: '1000000',
        resource: 'https://pv2-six.vercel.app/api/premium-stx',
        description: 'Access demo content with STX payment',
        mimeType: 'application/json',
        payTo: SERVER_ADDRESS,
        maxTimeoutSeconds: 300,
        asset: 'STX',
        outputSchema: {
          input: {
            type: 'request',
            method: 'GET',
            headerFields: {
              'x-proof': {
                type: 'string',
                required: false,
                description: 'Optional: ZK proof (base64 encoded)',
              },
              'x-nullifier': {
                type: 'string',
                required: false,
                description: 'Optional: Nullifier hash',
              },
            },
          },
          output: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            content: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                body: { type: 'string' },
                timestamp: { type: 'string' },
              },
            },
            privacy: {
              type: 'object',
              properties: {
                method: { type: 'string' },
                verified: { type: 'boolean' },
              },
            },
          },
        },
      },
      // USDCx - Content endpoint
      {
        scheme: 'exact',
        network: 'stacks',
        maxAmountRequired: '5000000',
        resource: 'https://pv2-six.vercel.app/api/content/{contentId}',
        description: 'Access premium content with USDCx payment',
        mimeType: 'application/json',
        payTo: SERVER_ADDRESS,
        maxTimeoutSeconds: 300,
        asset: 'USDCx',
        outputSchema: {
          input: {
            type: 'request',
            method: 'GET',
            pathParams: {
              contentId: {
                type: 'string',
                required: true,
                description: 'ID of the content to access',
              },
            },
            headerFields: {
              'x-proof': {
                type: 'string',
                required: false,
                description: 'Optional: ZK proof',
              },
            },
          },
          output: {
            success: { type: 'boolean' },
            contentId: { type: 'string' },
            content: { type: 'string' },
            payment: {
              type: 'object',
              properties: {
                asset: { type: 'string' },
                amount: { type: 'string' },
                method: { type: 'string' },
              },
            },
          },
        },
      },
      // sBTC - API execution endpoint
      {
        scheme: 'exact',
        network: 'stacks',
        maxAmountRequired: '10000',
        resource: 'https://pv2-six.vercel.app/api/execute',
        description: 'Execute paid API operations with sBTC payment',
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
              operation: {
                type: 'string',
                required: true,
                description: 'Operation to execute',
                enum: ['compute', 'analyze', 'transform'],
              },
              params: {
                type: 'object',
                required: true,
                description: 'Parameters for the operation',
              },
            },
            headerFields: {
              'x-proof': {
                type: 'string',
                required: false,
                description: 'Optional: ZK proof',
              },
            },
          },
          output: {
            success: { type: 'boolean' },
            operation: { type: 'string' },
            result: { type: 'object' },
            payment: {
              type: 'object',
              properties: {
                asset: { type: 'string' },
                amount: { type: 'string' },
                method: { type: 'string' },
              },
            },
          },
        },
      },
    ],
  };

  res.json(response);
});

// Demo endpoint (STX)
app.get('/api/premium-stx', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Demo access granted!',
    content: {
      title: 'Demo Content',
      body: 'This is premium demo content',
      timestamp: new Date().toISOString(),
    },
    privacy: {
      method: 'standard',
      verified: true,
    },
  });
});

// Content endpoint (USDCx)
app.get('/api/content/:contentId', (req: Request, res: Response) => {
  const { contentId } = req.params;
  res.json({
    success: true,
    contentId,
    content: `Premium content for ${contentId}`,
    payment: {
      asset: 'USDCx',
      amount: '5000000',
      method: 'standard',
    },
  });
});

// Execute endpoint (sBTC - POST)
app.post('/api/execute', (req: Request, res: Response) => {
  const { operation, params } = req.body;
  res.json({
    success: true,
    operation,
    result: {
      status: 'completed',
      data: params,
    },
    payment: {
      asset: 'sBTC',
      amount: '10000',
      method: 'standard',
    },
  });
});

// Health check
app.get(['/health', '/api/health'], (req: Request, res: Response) => {
  res.json({ status: 'ok', network: NETWORK });
});

export default app;
