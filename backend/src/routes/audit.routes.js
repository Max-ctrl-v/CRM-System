const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/audit?page=1&limit=50&action=&userId=&dateFrom=&dateTo=
router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const skip = (page - 1) * limit;

  const where = {};

  if (req.query.action) {
    where.action = req.query.action;
  }
  if (req.query.userId) {
    where.userId = req.query.userId;
  }
  if (req.query.dateFrom || req.query.dateTo) {
    where.createdAt = {};
    if (req.query.dateFrom) where.createdAt.gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) where.createdAt.lte = new Date(req.query.dateTo);
  }

  const [items, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }),
    prisma.activity.count({ where }),
  ]);

  res.json({
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}));

module.exports = router;
