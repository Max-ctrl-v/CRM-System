const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const commentService = require('../services/comment.service');
const authenticate = require('../middleware/auth');

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

// POST /api/comments
router.post('/', asyncHandler(async (req, res) => {
  const { content, entityType, entityId } = req.body;
  if (!content || !entityType || !entityId) {
    return res.status(400).json({ error: 'Inhalt, entityType und entityId erforderlich.' });
  }
  const comment = await commentService.create(req.body, req.user.id);
  res.status(201).json(comment);
}));

// DELETE /api/comments/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await commentService.remove(req.params.id, req.user.id, req.user.role);
  res.json({ message: 'Kommentar gelöscht.' });
}));

module.exports = router;
