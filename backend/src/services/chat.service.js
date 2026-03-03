const prisma = require('../lib/prisma');
const path = require('path');
const fs = require('fs');
const { AppError } = require('../middleware/errorHandler');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const USER_SELECT = { id: true, name: true, role: true };

async function create({ content, file, userId }) {
  const data = { content: content?.trim() || null, userId };

  if (file) {
    data.fileName = file.originalname;
    data.fileSize = file.size;
    data.mimeType = file.mimetype;
    data.filePath = file.filename;
  }

  if (!data.content && !data.filePath) {
    throw new AppError('Nachricht oder Datei erforderlich.', 400);
  }

  return prisma.chatMessage.create({
    data,
    include: { user: { select: USER_SELECT } },
  });
}

async function list({ cursor, limit = 50 } = {}) {
  const query = {
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: USER_SELECT } },
  };

  if (cursor) {
    query.skip = 1;
    query.cursor = { id: cursor };
  }

  return prisma.chatMessage.findMany(query);
}

async function getNewMessages(sinceDate) {
  return prisma.chatMessage.findMany({
    where: { createdAt: { gt: new Date(sinceDate) } },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: USER_SELECT } },
  });
}

async function remove(id, userId, userRole) {
  const message = await prisma.chatMessage.findUnique({ where: { id } });
  if (!message) throw new AppError('Nachricht nicht gefunden.', 404);
  if (userRole !== 'ADMIN' && message.userId !== userId) {
    throw new AppError('Keine Berechtigung zum Löschen.', 403);
  }

  if (message.filePath) {
    const fullPath = path.join(UPLOADS_DIR, message.filePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }

  return prisma.chatMessage.delete({ where: { id } });
}

async function getById(id) {
  return prisma.chatMessage.findUnique({ where: { id } });
}

module.exports = { create, list, getNewMessages, remove, getById, UPLOADS_DIR };
