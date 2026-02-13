import { Router } from 'express';

const router = Router();

// Health check for vision service
router.get('/vision/health', (req, res) => {
  res.json({ service: 'vision', status: 'ok' });
});

export default router;
