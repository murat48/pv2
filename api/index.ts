import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { paymentMiddleware, getPayment, STXtoMicroSTX } from 'x402-stacks';

const NETWORK = (process.env.NETWORK as 'mainnet' | 'testnet') || 'testnet';
const SERVER_ADDRESS = process.env.SERVER_ADDRESS!;
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com';

// Type definitions
type FieldDef = {
  type: string;
  required?: boolean;
  description?: string;
};

type Accepts = {
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  outputSchema?: {
    input: {
      type: "http";
      method: "GET" | "POST";
      bodyType?: "json" | "form-data";
      queryParams?: Record<string, FieldDef>;
      headerFields?: Record<string, FieldDef>;
    };
    output?: Record<string, any>;
  };
};

type x402Response = {
  x402Version: number;
  error?: string;
  accepts?: Array<Accepts>;
  payer?: string;
};

const app = express();
app.use(express.json());

// Registration endpoint - returns x402Response format
app.post('/register', (req: Request, res: Response) => {
  const response: x402Response = {
    x402Version: 2,
    accepts: [
      {
        scheme: 'exact',
        network: NETWORK,
        maxAmountRequired: '10',
        resource: `${FACILITATOR_URL}/register`,
        description: 'Register to access premium features',
        mimeType: 'application/json',
        payTo: SERVER_ADDRESS,
        maxTimeoutSeconds: 3600,
        asset: 'STX',
        outputSchema: {
          input: {
            type: 'http',
            method: 'POST',
            bodyType: 'json',
            queryParams: {
              address: { type: 'string', required: true, description: 'Stacks wallet address' },
            },
            headerFields: {
              'x-payment-id': { type: 'string', required: true, description: 'Payment transaction ID' },
            },
          },
          output: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              userId: { type: 'string' },
            },
          },
        },
      },
    ],
  };

  res.json(response);
});

// Receive registration after payment - handles x-payment-id header
app.post('/register/confirm', (req: Request, res: Response) => {
  const { address } = req.body;
  const paymentId = req.headers['x-payment-id'];

  if (!address || !paymentId) {
    const errorResponse: x402Response = {
      x402Version: 2,
      error: 'Missing address or payment ID',
    };
    return res.status(400).json(errorResponse);
  }

  const successResponse: x402Response = {
    x402Version: 2,
    payer: address,
  };

  res.json({
    success: true,
    message: 'Registration confirmed!',
    userId: `user_${address.slice(0, 8)}`,
    payment: {
      transactionId: paymentId,
      payer: address,
      network: NETWORK,
    },
  });
});

// Protected endpoint - requires STX payment (V2)
app.get(
  '/api/premium-data',
  paymentMiddleware({
    amount: STXtoMicroSTX(0.00001),
    payTo: SERVER_ADDRESS,
    network: NETWORK,
    asset: 'STX',
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
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', network: NETWORK });
});

export default app;
