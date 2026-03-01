const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notification.service');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// GET /api/notifications — list notifications
router.get('/', asyncHandler(async (req, res) => {
  const { limit, offset, unreadOnly } = req.query;
  const result = await notificationService.list(req.user.id, {
    limit: parseInt(limit) || 30,
    offset: parseInt(offset) || 0,
    unreadOnly: unreadOnly === 'true',
  });
  res.json(result);
}));

// GET /api/notifications/stream — SSE endpoint
router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);

  const userId = req.user.id;
  notificationService.addClient(userId, res);

  // Heartbeat every 55s — catch write errors from closed connections
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); notificationService.removeClient(userId, res); }
  }, 55000);

  req.on('close', () => {
    clearInterval(heartbeat);
    notificationService.removeClient(userId, res);
  });
});

// PATCH /api/notifications/read-all — mark all as read (must be before /:id/read)
router.patch('/read-all', asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user.id);
  res.json({ message: 'Alle als gelesen markiert.' });
}));

// PATCH /api/notifications/:id/read — mark single as read
router.patch('/:id/read', asyncHandler(async (req, res) => {
  await notificationService.markRead(req.params.id, req.user.id);
  res.json({ message: 'Gelesen.' });
}));

module.exports = router;
