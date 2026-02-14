import type { VercelRequest, VercelResponse } from '@vercel/node';
import { STXtoMicroSTX } from 'x402-stacks';

function calculatePaymentAmount(
  tier: 'standard' | 'advanced' | 'premium' | 'enterprise',
  hasImage: boolean
): number {
  const basePrices: Record<string, Record<string, number>> = {
    standard: { text: 0.01, image: 0.02 },
    advanced: { text: 0.02, image: 0.04 },
    premium: { text: 0.03, image: 0.06 },
    enterprise: { text: 0.05, image: 0.10 },
  };

  return basePrices[tier][hasImage ? 'image' : 'text'] || 0.01;
}

function formatSTXAmount(stx: number): string {
  return `${stx.toFixed(6)} STX`;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { tier, hasImage } = req.body;

  if (!tier || !['standard', 'advanced', 'premium', 'enterprise'].includes(tier)) {
    res.status(400).json({ success: false, error: 'Valid tier required' });
    return;
  }

  const amount = calculatePaymentAmount(
    tier as 'standard' | 'advanced' | 'premium' | 'enterprise',
    hasImage || false
  );

  const network = process.env.NETWORK || 'testnet';
  const facilitatorUrl = process.env.FACILITATOR_URL || 'https://facilitator.stacksx402.com';
  const serverAddress = process.env.SERVER_ADDRESS || '';

  res.json({
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
}
