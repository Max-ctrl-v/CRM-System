const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const taskService = require('../services/task.service');
const authenticate = require('../middleware/auth');
const activityService = require('../services/activity.service');
const notificationService = require('../services/notification.service');

router.use(authenticate);

// GET /api/tasks?companyId=&contactId=&assignedToId=&done=
router.get('/', asyncHandler(async (req, res) => {
  const { companyId, contactId, assignedToId, done } = req.query;
  const tasks = await taskService.getAll({ companyId, contactId, assignedToId, done });
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

  // Notify assigned user
  if (task.assignedToId && task.assignedToId !== req.user.id) {
    notificationService.create({
      type: 'TASK_ASSIGNED',
      title: 'Neue Aufgabe zugewiesen',
      message: `${req.user.name} hat dir die Aufgabe "${task.title}" zugewiesen.`,
      link: task.companyId ? `/company/${task.companyId}` : '/aufgaben',
      userId: task.assignedToId,
    }).catch(() => {});
  }

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
  if (done && task.companyId) {
    activityService.log('TASK_COMPLETED', 'COMPANY', task.companyId, req.user.id, { taskTitle: task.title }).catch(() => {});
  }
  res.json(task);
}));

// DELETE /api/tasks/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const task = await taskService.getById(req.params.id);
  if (req.user.role !== 'ADMIN' && task.createdBy?.id !== req.user.id && task.assignedTo?.id !== req.user.id) {
    return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieser Aufgabe.' });
  }
  await taskService.remove(req.params.id);
  res.json({ message: 'Aufgabe gelöscht.' });
}));

module.exports = router;
