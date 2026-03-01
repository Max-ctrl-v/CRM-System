const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const authenticate = require('../middleware/auth');
const prisma = require('../lib/prisma');

router.use(authenticate);

function getDateFrom(range) {
  if (!range || range === 'all') return null;
  const now = new Date();
  const days = { '7d': 7, '30d': 30, '90d': 90 }[range];
  if (!days) return null;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

// GET /api/dashboard/stats?range=7d|30d|90d|all
router.get('/stats', asyncHandler(async (req, res) => {
  const dateFrom = getDateFrom(req.query.range);
  const dateFilter = dateFrom ? { createdAt: { gte: dateFrom } } : {};
  const companyDateFilter = dateFrom ? { createdAt: { gte: dateFrom } } : {};

  const [
    totalCompanies,
    stageGroups,
    overdueTasks,
    recentActivities,
    totalRevenueResult,
    newCompanies,
    completedTasks,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.groupBy({
      by: ['pipelineStage'],
      _count: { id: true },
      _sum: { expectedRevenue: true },
    }),
    prisma.task.count({
      where: { done: false, dueDate: { lt: new Date() } },
    }),
    prisma.activity.findMany({
      where: dateFilter,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
    prisma.company.aggregate({
      _sum: { expectedRevenue: true },
      where: {
        pipelineStage: { in: ['FIRMA_IDENTIFIZIERT', 'FIRMA_KONTAKTIERT', 'VERHANDLUNG'] },
      },
    }),
    prisma.company.count({ where: companyDateFilter }),
    prisma.task.count({ where: { done: true, ...dateFilter } }),
  ]);

  const openDeals = stageGroups
    .filter((g) => g.pipelineStage && !['CLOSED_WON', 'CLOSED_LOST'].includes(g.pipelineStage))
    .reduce((sum, g) => sum + g._count.id, 0);

  res.json({
    totalCompanies,
    openDeals,
    totalRevenueForecast: totalRevenueResult._sum.expectedRevenue || 0,
    overdueTasks,
    stageBreakdown: stageGroups.map((g) => ({
      stage: g.pipelineStage,
      count: g._count.id,
      revenue: g._sum.expectedRevenue || 0,
    })),
    recentActivities,
    newCompanies,
    completedTasks,
  });
}));

// GET /api/dashboard/revenue-forecast
router.get('/revenue-forecast', asyncHandler(async (req, res) => {
  const now = new Date();
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = start.toLocaleString('de-DE', { month: 'short', year: '2-digit' });

    const [won, pipeline] = await Promise.all([
      prisma.company.aggregate({
        _sum: { expectedRevenue: true },
        where: {
          pipelineStage: 'CLOSED_WON',
          updatedAt: { gte: start, lte: end },
        },
      }),
      prisma.company.aggregate({
        _sum: { expectedRevenue: true },
        where: {
          pipelineStage: { in: ['FIRMA_IDENTIFIZIERT', 'FIRMA_KONTAKTIERT', 'VERHANDLUNG'] },
          updatedAt: { gte: start, lte: end },
        },
      }),
    ]);

    months.push({
      label,
      won: won._sum.expectedRevenue || 0,
      pipeline: pipeline._sum.expectedRevenue || 0,
    });
  }

  res.json(months);
}));

// GET /api/dashboard/heatmap
router.get('/heatmap', asyncHandler(async (req, res) => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const activities = await prisma.activity.findMany({
    where: { createdAt: { gte: ninetyDaysAgo } },
    select: { createdAt: true },
  });

  const heatmap = {};
  for (const a of activities) {
    const dateKey = a.createdAt.toISOString().split('T')[0];
    heatmap[dateKey] = (heatmap[dateKey] || 0) + 1;
  }

  res.json(heatmap);
}));

// GET /api/dashboard/funnel
router.get('/funnel', asyncHandler(async (req, res) => {
  const stages = ['FIRMA_IDENTIFIZIERT', 'FIRMA_KONTAKTIERT', 'VERHANDLUNG', 'CLOSED_WON'];
  const counts = await prisma.company.groupBy({
    by: ['pipelineStage'],
    _count: { id: true },
    where: { pipelineStage: { not: null } },
  });

  const countMap = {};
  for (const c of counts) {
    countMap[c.pipelineStage] = c._count.id;
  }

  const funnel = stages.map((stage, i) => {
    const count = countMap[stage] || 0;
    const prevCount = i > 0 ? (countMap[stages[i - 1]] || 0) : count;
    return {
      stage,
      count,
      conversionRate: prevCount > 0 ? Math.round((count / prevCount) * 100) : 0,
    };
  });

  res.json(funnel);
}));

module.exports = router;
