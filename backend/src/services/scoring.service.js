const prisma = require('../lib/prisma');

// Stage weights for deal probability
const STAGE_WEIGHTS = {
  FIRMA_IDENTIFIZIERT: 10,
  FIRMA_KONTAKTIERT: 30,
  VERHANDLUNG: 60,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
};

async function calculateScore(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      contacts: { select: { id: true } },
      tasks: { select: { id: true, done: true } },
    },
  });
  if (!company) return null;

  let score = 0;

  // Stage weight (0-40 points)
  const stageWeight = STAGE_WEIGHTS[company.pipelineStage] || 0;
  score += stageWeight * 0.4;

  // Contacts bonus (0-15 points, max at 3+)
  const contactCount = company.contacts.length;
  score += Math.min(contactCount, 3) * 5;

  // Activity recency (0-20 points)
  const recentActivity = await prisma.activity.findFirst({
    where: { entityType: 'COMPANY', entityId: companyId },
    orderBy: { createdAt: 'desc' },
  });
  if (recentActivity) {
    const daysSince = (Date.now() - recentActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 3) score += 20;
    else if (daysSince < 7) score += 15;
    else if (daysSince < 14) score += 10;
    else if (daysSince < 30) score += 5;
  }

  // Task completion rate (0-15 points)
  const totalTasks = company.tasks.length;
  if (totalTasks > 0) {
    const doneTasks = company.tasks.filter((t) => t.done).length;
    score += (doneTasks / totalTasks) * 15;
  }

  // Revenue set bonus (0-10 points)
  if (company.expectedRevenue && company.expectedRevenue > 0) {
    score += 10;
  }

  return Math.min(Math.round(score), 100);
}

async function batchScores(companyIds) {
  const results = {};
  await Promise.all(
    companyIds.map(async (id) => {
      results[id] = await calculateScore(id);
    })
  );
  return results;
}

module.exports = { calculateScore, batchScores };
