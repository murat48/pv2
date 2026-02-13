import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router as visionRouter } from './routes/x402.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
const NETWORK = (process.env.NETWORK as 'mainnet' | 'testnet') || 'testnet';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/vision', visionRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Smart Vision Bot Backend running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Network: ${NETWORK}`);  
  console.log(`Network: ${NETWORK}`);
  console.log(`Facilitator: ${FACILITATOR_URL}`);
  console.log(`💰 x402-stacks Payment Middleware: ACTIVE`);
});
