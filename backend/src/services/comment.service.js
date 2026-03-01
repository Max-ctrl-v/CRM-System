const prisma = require('../lib/prisma');

async function getByEntity(entityType, entityId) {
  return prisma.comment.findMany({
    where: { entityType, entityId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function create(data, userId) {
  return prisma.comment.create({
    data: {
      content: data.content,
      entityType: data.entityType,
      entityId: data.entityId,
      userId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

async function remove(id, userId, userRole) {
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return null;

  if (comment.userId !== userId && userRole !== 'ADMIN') {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('Nur eigene Kommentare können gelöscht werden.', 403);
  }

  return prisma.comment.delete({ where: { id } });
}

async function getLatestBatch(entityType, entityIds) {
  // Get all comments for these entities, then pick latest per entityId
  const comments = await prisma.comment.findMany({
    where: { entityType, entityId: { in: entityIds } },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const map = {};
  for (const c of comments) {
    if (!map[c.entityId]) map[c.entityId] = c;
  }
  return map;
}

module.exports = { getByEntity, create, remove, getLatestBatch };
