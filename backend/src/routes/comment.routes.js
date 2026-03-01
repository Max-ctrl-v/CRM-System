const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const commentService = require('../services/comment.service');
const authenticate = require('../middleware/auth');
const activityService = require('../services/activity.service');
const notificationService = require('../services/notification.service');
const prisma = require('../lib/prisma');

router.use(authenticate);

// GET /api/comments?entityType=COMPANY&entityId=xxx
router.get('/', asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.query;
  if (!entityType || !entityId) {
    return res.status(400).json({ error: 'entityType und entityId erforderlich.' });
  }
  const comments = await commentService.getByEntity(entityType, entityId);
  res.json(comments);
}));

// GET /api/comments/latest-batch?entityType=COMPANY&entityIds=id1,id2,id3
router.get('/latest-batch', asyncHandler(async (req, res) => {
  const { entityType, entityIds } = req.query;
  if (!entityType || !entityIds) {
    return res.status(400).json({ error: 'entityType und entityIds erforderlich.' });
  }
  const ids = entityIds.split(',').filter(Boolean);
  const latest = await commentService.getLatestBatch(entityType, ids);
  res.json(latest);
}));

// POST /api/comments
router.post('/', asyncHandler(async (req, res) => {
  const { content, entityType, entityId } = req.body;
  if (!content?.trim() || !entityType || !entityId) {
    return res.status(400).json({ error: 'Inhalt, entityType und entityId erforderlich.' });
  }
  if (content.trim().length > 5000) {
    return res.status(400).json({ error: 'Kommentar zu lang (max. 5000 Zeichen).' });
  }
  if (!['COMPANY', 'CONTACT'].includes(entityType)) {
    return res.status(400).json({ error: 'Ungültiger entityType.' });
  }
  const comment = await commentService.create(req.body, req.user.id);
  activityService.log('COMMENT_ADDED', entityType, entityId, req.user.id, { commentId: comment.id }).catch(() => {});

  // Parse @mentions and notify mentioned users
  const mentionedUserIds = new Set();

  // Fetch all users and check if any name appears after an @ in the comment
  const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
  const contentLower = content.trim().toLowerCase();
  for (const u of allUsers) {
    if (u.id === req.user.id) continue;
    const atName = `@${u.name.toLowerCase()}`;
    if (contentLower.includes(atName)) {
      mentionedUserIds.add(u.id);
    }
  }

  const link = entityType === 'COMPANY' ? `/company/${entityId}` : null;

  for (const userId of mentionedUserIds) {
    notificationService.create({
      type: 'COMMENT_ADDED',
      title: 'Du wurdest erwähnt',
      message: `${req.user.name} hat dich in einem Kommentar erwähnt: "${content.trim().slice(0, 80)}${content.trim().length > 80 ? '...' : ''}"`,
      link,
      userId,
    }).catch(() => {});
  }

  // Notify company owner about new comment (skip if already mentioned)
  if (entityType === 'COMPANY') {
    const company = await prisma.company.findUnique({ where: { id: entityId }, select: { assignedToId: true, name: true } });
    if (company?.assignedToId && company.assignedToId !== req.user.id && !mentionedUserIds.has(company.assignedToId)) {
      notificationService.create({
        type: 'COMMENT_ADDED',
        title: 'Neuer Kommentar',
        message: `${req.user.name} hat einen Kommentar bei "${company.name}" hinterlassen.`,
        link: `/company/${entityId}`,
        userId: company.assignedToId,
      }).catch(() => {});
    }
  }

  res.status(201).json(comment);
}));

// DELETE /api/comments/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await commentService.remove(req.params.id, req.user.id, req.user.role);
  res.json({ message: 'Kommentar gelöscht.' });
}));

module.exports = router;
