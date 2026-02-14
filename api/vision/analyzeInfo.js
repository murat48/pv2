module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, imageBase64 } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Missing question' });
  }

  function detectComplexity(question, hasImage) {
    const lowerQuestion = question.toLowerCase();
    const wordCount = question.split(/\s+/).length;

    if (
      wordCount > 30 ||
      /complex|advanced analysis|multiple perspectives|enterprise|strategic/i.test(lowerQuestion)
    ) {
      return 4;
    }

    if (/why|how|explain|analyze|describe|compare/.test(lowerQuestion)) {
      return 3;
    }
    if (
      /detailed|comprehensive|in depth|thorough|elaborate|extensive|complete/.test(
        lowerQuestion
      )
    ) {
      return 3;
    }

    if (wordCount > 15) {
      return 2;
    }
    if (/detail|more|information|about|tell|show/i.test(lowerQuestion)) {
      return 2;
    }

    return 1;
  }

  function mapComplexityToTier(complexity) {
    switch (complexity) {
      case 4:
        return 'enterprise';
      case 3:
        return 'premium';
      case 2:
        return 'advanced';
      default:
        return 'standard';
    }
  }

  function estimateCost(tier) {
    const costs = {
      standard: 0,
      advanced: 0.02,
      premium: 0.06,
      enterprise: 0.1,
    };
    return costs[tier] || 0;
  }

  const hasImage = !!imageBase64;
  const complexity = detectComplexity(question, hasImage);
  const selectedTier = mapComplexityToTier(complexity);
  const estimatedCost = estimateCost(selectedTier);

  res.status(200).json({
    success: true,
    complexity,
    selectedTier,
    estimatedCost,
    hasSampleImage: hasImage,
  });
};
