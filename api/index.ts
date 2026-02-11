import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { paymentMiddleware, getPayment, STXtoMicroSTX } from 'x402-stacks';

const NETWORK = (process.env.NETWORK as 'mainnet' | 'testnet') || 'testnet';
const SERVER_ADDRESS = process.env.SERVER_ADDRESS!;
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Premium Service';
const SERVICE_IMAGE = process.env.SERVICE_IMAGE || 'https://your-api.com/logo.png';

// Type definitions for x402 response
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
    queryParams?: Record<string, FieldDef>;
    bodyParams?: Record<string, FieldDef>;
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
  asset: string;
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

// X402 Registration endpoint - matches both /register and /api/register
app.get(['/register', '/api/register'], (req: Request, res: Response) => {
  const response: x402RegisterResponse = {
    x402Version: 1,
    name: SERVICE_NAME,
    image: SERVICE_IMAGE,
    accepts: [
      {
        scheme: 'exact',
        network: 'stacks',
        maxAmountRequired: '10',
        resource: 'https://pv2-six.vercel.app/api/premium-data',
        description: 'Get premium data with STX payment',
        mimeType: 'application/json',
        payTo: SERVER_ADDRESS,
        maxTimeoutSeconds: 60,
        asset: 'STX',
        outputSchema: {
          input: {
            type: 'request',
            method: 'GET',
            queryParams: {
              format: {
                type: 'string',
                required: false,
                description: 'Response format (json/xml)',
                enum: ['json', 'xml'],
              },
            },
          },
          output: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                secretValue: { type: 'number' },
                timestamp: { type: 'string' },
              },
            },
            payment: {
              type: 'object',
              properties: {
                transaction: { type: 'string' },
                payer: { type: 'string' },
                network: { type: 'string' },
              },
            },
          },
        },
      },
    ],
  };

  res.json(response);
});

// Protected endpoint - requires STX payment (V2)
app.get(
  ['/api/premium-data', '/premium-data'],
  paymentMiddleware({
    amount: STXtoMicroSTX(0.00001),
    payTo: SERVER_ADDRESS,
    network: NETWORK,
   facilitatorUrl: FACILITATOR_URL,
  }),
  (req: Request, res: Response) => {
    const payment = getPayment(req);

    res.json({
      success: true,
      message: 'Premium data access granted!',
      data: {
        secretValue: 42,
        timestamp: new Date().toISOString()
      },
      payment: {
        transaction: payment?.transaction,
        payer: payment?.payer,
        network: payment?.network,
      },
    });
  }
);

// Health check endpoint (no payment required)
app.get(['/health', '/api/health'], (req: Request, res: Response) => {
  res.json({ status: 'ok', network: NETWORK });
});

export default app;
