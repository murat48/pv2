import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const geminiKey = process.env.GEMINI_API_KEY;
  
  res.json({
    gemini_key_present: !!geminiKey,
    gemini_key_value: geminiKey ? geminiKey.substring(0, 10) + '...' : 'NOT FOUND',
    all_env_vars: Object.keys(process.env).filter(k => !k.includes('NODE_OPTIONS')).slice(0, 20)
  });
}
