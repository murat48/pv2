import AutoPayEngine from './autopay-engine';

/**
 * Demo agent showing how to use AutoPayEngine
 */
async function main() {
  const privateKey = process.env.VITE_CLIENT_PRIVATE_KEY || '206004c56e6ea9e7164b972b6f257b9848806cea9834376314ff3d737d19286b01';
  const apiUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3003/api';
  
  console.log('🚀 x402 AutoPay Agent Demo');
  console.log(`📡 API: ${apiUrl}`);
  console.log(`💰 Wallet: ${privateKey.slice(0, 10)}...`);
  console.log('---');

  const engine = new AutoPayEngine(privateKey, apiUrl, 'testnet');

  // Example: Process a vision analysis request
  try {
    const result = await engine.processRequest('/vision/analyze', {
      question: 'What is this image about?',
      imageBase64: null,
    });

    console.log('\n✨ Analysis Result:');
    console.log(`Tier: ${result.tier}`);
    console.log(`Analysis: ${result.analysis}`);
    console.log(`Accuracy: ${(result.accuracy * 100).toFixed(1)}%`);
    console.log(`Cost Paid: ${result.cost_paid} STX`);
  } catch (error: any) {
    console.error('❌ Demo failed:', error.message);
  }
}

main().catch(console.error);
