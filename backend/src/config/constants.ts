export const config = {
  // Pricing (STX)
  prices: {
    standard: { text: 0.01, image: 0.02 },
    advanced: { text: 0.02, image: 0.04 },
    premium: { text: 0.03, image: 0.06 },
    enterprise: { text: 0.05, image: 0.10 },
  },

  // Token Limits
  tokenLimits: {
    standard: 500,
    advanced: 2000,
    premium: 5000,
    enterprise: 10000,
  },

  // Quality Requirements
  minQualityScore: 0.60,

  // Daily Limit
  dailyLimitSTX: 0.5,

  // API Configuration
  geminiModel: 'gemini-2.0-flash',
  geminiTimeout: 300000, // 5 minutes

  // Max Price Increase
  maxPriceIncreasePercent: 500,
};
