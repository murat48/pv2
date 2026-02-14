import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing or invalid url parameter' });
    return;
  }

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        ...req.headers,
        host: new URL(url).host,
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json')
      ? await response.json()
      : await response.text();

    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from backend' });
  }
}
