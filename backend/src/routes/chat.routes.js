const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const chatService = require('../services/chat.service');
const notificationService = require('../services/notification.service');
const authenticate = require('../middleware/auth');
const prisma = require('../lib/prisma');

router.use(authenticate);

// Multer config (same pattern as attachment.routes.js)
const storage = multer.diskStorage({
  destination: chatService.UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `${name}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const blocked = [
      '.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.com', '.scr',
      '.pif', '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.dll',
      '.jar', '.cpl', '.reg', '.inf', '.hta', '.lnk',
    ];
    const name = file.originalname.toLowerCase();
    const ext = path.extname(name);
    const parts = name.split('.');
    const hasBlockedExt = parts.slice(1).some((p) => blocked.includes(`.${p}`));
    if (blocked.includes(ext) || hasBlockedExt) {
      return cb(new Error('Dateityp nicht erlaubt.'));
    }
    cb(null, true);
  },
});

// GET /api/chat/messages?cursor=xxx&limit=50
router.get('/messages', asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query;
  const messages = await chatService.list({
    cursor: cursor || undefined,
    limit: limit ? parseInt(limit, 10) : 50,
  });
  res.json(messages);
}));

// GET /api/chat/messages/new?since=ISO_DATE
router.get('/messages/new', asyncHandler(async (req, res) => {
  const { since } = req.query;
  if (!since) return res.status(400).json({ error: 'since Parameter erforderlich.' });
  const messages = await chatService.getNewMessages(since);
  res.json(messages);
}));

// POST /api/chat/messages (JSON for text-only, multipart when file attached)
router.post('/messages', (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    upload.single('file')(req, res, next);
  } else {
    next();
  }
}, asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content?.trim() && !req.file) {
    return res.status(400).json({ error: 'Nachricht oder Datei erforderlich.' });
  }
  if (content && content.trim().length > 5000) {
    return res.status(400).json({ error: 'Nachricht zu lang (max. 5000 Zeichen).' });
  }

  const message = await chatService.create({
    content,
    file: req.file,
    userId: req.user.id,
  });

  // Parse @mentions and @all (same pattern as comment.routes.js)
  if (content?.trim()) {
    const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
    const contentLower = content.trim().toLowerCase();
    const mentionedUserIds = new Set();

    if (contentLower.includes('@all')) {
      for (const u of allUsers) {
        mentionedUserIds.add(u.id);
      }
    } else {
      for (const u of allUsers) {
        if (u.id === req.user.id) continue;
        if (contentLower.includes(`@${u.name.toLowerCase()}`)) {
          mentionedUserIds.add(u.id);
        }
      }
    }

    const snippet = content.trim().slice(0, 80) + (content.trim().length > 80 ? '...' : '');
    for (const userId of mentionedUserIds) {
      notificationService.create({
        type: 'CHAT_MENTION',
        title: 'Neue Chat-Erwähnung',
        message: `${req.user.name}: "${snippet}"`,
        link: '/chat',
        userId,
      }).catch(() => {});
    }
  }

  res.status(201).json(message);
}));

// DELETE /api/chat/messages/:id
router.delete('/messages/:id', asyncHandler(async (req, res) => {
  await chatService.remove(req.params.id, req.user.id, req.user.role);
  res.json({ message: 'Nachricht gelöscht.' });
}));

// GET /api/chat/messages/:id/download
router.get('/messages/:id/download', asyncHandler(async (req, res) => {
  const msg = await chatService.getById(req.params.id);
  if (!msg || !msg.filePath) {
    return res.status(404).json({ error: 'Datei nicht gefunden.' });
  }
  const fullPath = path.resolve(chatService.UPLOADS_DIR, msg.filePath);
  if (!fullPath.startsWith(path.resolve(chatService.UPLOADS_DIR))) {
    return res.status(400).json({ error: 'Ungültiger Dateipfad.' });
  }
  res.download(fullPath, msg.fileName);
}));

module.exports = router;
