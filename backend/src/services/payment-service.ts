import { STXtoMicroSTX } from 'x402-stacks';

export interface PaymentConfig {
  amount: string | bigint; // in microSTX
  payTo: string;
  network: 'mainnet' | 'testnet' | string;
  facilitatorUrl: string;
  asset?: string;
  description?: string;
  maxTimeoutSeconds?: number;
}

export interface PaymentDetails {
  tier: string;
  amountSTX: number;
  amountMicroSTX: string | bigint;
  payTo: string;
  network: string;
  facilitatorUrl: string;
  description: string;
}

/**
 * Calculate payment amount based on tier and request type
 */
export function calculatePaymentAmount(
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

/**
 * Build payment middleware configuration
 */
export function buildPaymentConfig(
  tier: string,
  amountSTX: number,
  payTo: string,
  network: string,
  facilitatorUrl: string,
  hasImage: boolean = false
): PaymentConfig {
  const microSTX = STXtoMicroSTX(amountSTX);

  return {
    amount: microSTX,
    payTo,
    network: network as 'mainnet' | 'testnet',
    facilitatorUrl,
    asset: 'STX',
    description: `Vision AI Analysis - ${tier.toUpperCase()} Tier${hasImage ? ' (with image)' : ''}`,
    maxTimeoutSeconds: 300,
  };
}

/**
 * Get tier-specific payment details
 */
export function getPaymentDetails(
  tier: string,
  hasImage: boolean,
  payTo: string,
  network: string,
  facilitatorUrl: string
): PaymentDetails {
  const amountSTX = calculatePaymentAmount(
    tier as 'standard' | 'advanced' | 'premium' | 'enterprise',
    hasImage
  );

  return {
    tier,
    amountSTX,
    amountMicroSTX: STXtoMicroSTX(amountSTX),
    payTo,
    network,
    facilitatorUrl,
    description: `Vision AI Analysis - ${tier.toUpperCase()} Tier${hasImage ? ' (with image)' : ''}`,
  };
}

/**
 * Determine if response should trigger payment
 * Payment is triggered when quality score is above threshold (usually >= 0.60)
 */
export function shouldChargeForResponse(qualityScore: number, minQualityScore: number = 0.60): boolean {
  return qualityScore >= minQualityScore;
}

/**
 * Format STX amount for display
 */
export function formatSTXAmount(stx: number): string {
  return `${stx.toFixed(6)} STX`;
}
