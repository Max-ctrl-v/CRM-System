const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const authenticate = require('../middleware/auth');
const prisma = require('../lib/prisma');

router.use(authenticate);

// GET /api/search?q=...
router.get('/', asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2 || q.length > 200) return res.json({ companies: [], contacts: [], tasks: [] });

  const [companies, contacts, tasks] = await Promise.all([
    prisma.company.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, pipelineStage: true, website: true },
      take: 5,
    }),
    prisma.contact.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true, companyId: true, company: { select: { name: true } } },
      take: 5,
    }),
    prisma.task.findMany({
      where: { title: { contains: q, mode: 'insensitive' } },
      select: { id: true, title: true, done: true, companyId: true, company: { select: { name: true } } },
      take: 5,
    }),
  ]);

  res.json({ companies, contacts, tasks });
}));

module.exports = router;
