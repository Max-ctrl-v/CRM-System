const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const authenticate = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

module.exports = router;
