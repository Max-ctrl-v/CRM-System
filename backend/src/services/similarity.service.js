const prisma = require('../lib/prisma');

async function findSimilar(companyId, limit = 5) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      city: true,
      pipelineStage: true,
      expectedRevenue: true,
      perplexityResult: true,
    },
  });
  if (!company) return [];

  // Find candidates (exclude self and closed-lost)
  const candidates = await prisma.company.findMany({
    where: {
      id: { not: companyId },
      pipelineStage: { not: 'CLOSED_LOST' },
    },
    select: {
      id: true,
      name: true,
      city: true,
      pipelineStage: true,
      expectedRevenue: true,
      perplexityResult: true,
      website: true,
    },
  });

  // Score each candidate
  const scored = candidates.map((c) => {
    let score = 0;
    const reasons = [];

    // Same city match
    if (company.city && c.city && company.city.toLowerCase() === c.city.toLowerCase()) {
      score += 30;
      reasons.push('Gleiche Stadt');
    }

    // Similar revenue range (within 50%)
    if (company.expectedRevenue && c.expectedRevenue) {
      const ratio = Math.min(company.expectedRevenue, c.expectedRevenue) /
        Math.max(company.expectedRevenue, c.expectedRevenue);
      if (ratio > 0.5) {
        score += 25;
        reasons.push('Ähnlicher Umsatz');
      }
    }

    // Same pipeline stage
    if (company.pipelineStage && company.pipelineStage === c.pipelineStage) {
      score += 15;
      reasons.push('Gleiche Pipeline-Stufe');
    }

    // Perplexity keyword overlap
    if (company.perplexityResult && c.perplexityResult) {
      const getKeywords = (text) => {
        const words = text.toLowerCase()
          .replace(/[^a-zäöüß\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 4);
        return new Set(words);
      };
      const kw1 = getKeywords(company.perplexityResult);
      const kw2 = getKeywords(c.perplexityResult);
      let overlap = 0;
      for (const w of kw1) {
        if (kw2.has(w)) overlap++;
      }
      if (overlap > 10) {
        score += 30;
        reasons.push('Ähnliches Firmenprofil');
      } else if (overlap > 5) {
        score += 15;
        reasons.push('Teilweise ähnliches Profil');
      }
    }

    return { ...c, score, reasons };
  });

  // Sort by score descending, return top N with score > 0
  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ perplexityResult, ...rest }) => rest);
}

module.exports = { findSimilar };
