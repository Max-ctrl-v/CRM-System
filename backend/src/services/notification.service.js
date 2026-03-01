const prisma = require('../lib/prisma');

// SSE connection manager
const sseClients = new Map(); // userId -> Set<res>

function addClient(userId, res) {
  if (!sseClients.has(userId)) {
    sseClients.set(userId, new Set());
  }
  sseClients.get(userId).add(res);
}

function removeClient(userId, res) {
  const clients = sseClients.get(userId);
  if (clients) {
    clients.delete(res);
    if (clients.size === 0) sseClients.delete(userId);
  }
}

function pushToUser(userId, data) {
  const clients = sseClients.get(userId);
  if (clients) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) {
      try { res.write(payload); } catch { clients.delete(res); }
    }
    if (clients.size === 0) sseClients.delete(userId);
  }
}

async function create({ type, title, message, link, userId }) {
  const notification = await prisma.notification.create({
    data: { type, title, message, link, userId },
  });
  pushToUser(userId, { type: 'NEW_NOTIFICATION', notification });
  return notification;
}

async function list(userId, { limit = 30, offset = 0, unreadOnly = false } = {}) {
  const where = { userId };
  if (unreadOnly) where.read = false;

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  return { items, total, unreadCount };
}

async function markRead(id, userId) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
}

async function markAllRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

async function getUnreadCount(userId) {
  return prisma.notification.count({ where: { userId, read: false } });
}

module.exports = {
  create,
  list,
  markRead,
  markAllRead,
  getUnreadCount,
  addClient,
  removeClient,
};
