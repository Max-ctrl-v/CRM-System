const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const savedViewService = require('../services/savedView.service');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// GET /api/saved-views
router.get('/', asyncHandler(async (req, res) => {
  const views = await savedViewService.list(req.user.id);
  res.json(views);
}));

// POST /api/saved-views
router.post('/', asyncHandler(async (req, res) => {
  const { name, filters, isGlobal } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Name erforderlich.' });
  }
  const view = await savedViewService.create({ name, filters, isGlobal }, req.user.id);
  res.status(201).json(view);
}));

// PUT /api/saved-views/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const view = await savedViewService.update(req.params.id, req.body, req.user.id);
  res.json(view);
}));

// DELETE /api/saved-views/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await savedViewService.remove(req.params.id, req.user.id);
  res.json({ message: 'Ansicht gelöscht.' });
}));

module.exports = router;
