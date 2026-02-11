import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { paymentMiddleware, getPayment, STXtoMicroSTX } from 'x402-stacks';

const NETWORK = (process.env.NETWORK as 'mainnet' | 'testnet') || 'testnet';
const SERVER_ADDRESS = process.env.SERVER_ADDRESS!;
const PORT = process.env.PORT || 3003;
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com';

const app = express();
app.use(express.json());

// Protected endpoint - requires STX payment (V2)
app.get(
  '/api/premium-data',
  paymentMiddleware({
    amount: STXtoMicroSTX(0.00001), // 0.00001 STX = 10 microSTX
    payTo: SERVER_ADDRESS,          // V2 uses 'payTo' instead of 'address'
    network: NETWORK,               // Accepts 'testnet', 'mainnet', or CAIP-2 format

    facilitatorUrl: FACILITATOR_URL,
  }),
  (req: Request, res: Response) => {
    // Get payment details from the verified request
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Network: ${NETWORK}`);
  console.log(`Facilitator: ${FACILITATOR_URL}`);
});