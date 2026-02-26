const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

module.exports = { getByEntity, create, remove };
