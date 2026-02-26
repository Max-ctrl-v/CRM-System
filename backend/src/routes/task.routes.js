const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const taskService = require('../services/task.service');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// GET /api/tasks?companyId=&contactId=&done=
router.get('/', asyncHandler(async (req, res) => {
  const { companyId, contactId, done } = req.query;
  const tasks = await taskService.getAll({ companyId, contactId, done });
  res.json(tasks);
}));

// GET /api/tasks/overdue
router.get('/overdue', asyncHandler(async (req, res) => {
  const tasks = await taskService.getOverdue();
  res.json(tasks);
}));

// GET /api/tasks/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const task = await taskService.getById(req.params.id);
  res.json(task);
}));

// POST /api/tasks
router.post('/', asyncHandler(async (req, res) => {
  const task = await taskService.create(req.body, req.user.id);
  res.status(201).json(task);
}));

// PUT /api/tasks/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const task = await taskService.update(req.params.id, req.body);
  res.json(task);
}));

// PATCH /api/tasks/:id/done
router.patch('/:id/done', asyncHandler(async (req, res) => {
  const { done } = req.body;
  if (done === undefined) return res.status(400).json({ error: 'done-Wert erforderlich.' });
  const task = await taskService.toggleDone(req.params.id, done);
  res.json(task);
}));

// DELETE /api/tasks/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await taskService.remove(req.params.id);
  res.json({ message: 'Aufgabe gelöscht.' });
}));

module.exports = router;
