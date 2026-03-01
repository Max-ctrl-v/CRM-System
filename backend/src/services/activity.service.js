const prisma = require('../lib/prisma');

async function log(action, entityType, entityId, userId, metadata = {}) {
  return prisma.activity.create({
    data: { action, entityType, entityId, userId, metadata },
  });
}

async function getByEntity(entityType, entityId, limit = 50) {
  return prisma.activity.findMany({
    where: { entityType, entityId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function getRecent(limit = 20) {
  return prisma.activity.findMany({
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

module.exports = { log, getByEntity, getRecent };
