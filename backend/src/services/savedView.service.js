const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function create(data, userId) {
  return prisma.savedView.create({
    data: {
      name: data.name,
      filters: data.filters,
      isGlobal: data.isGlobal || false,
      userId,
    },
  });
}

async function list(userId) {
  return prisma.savedView.findMany({
    where: {
      OR: [{ userId }, { isGlobal: true }],
    },
    orderBy: { updatedAt: 'desc' },
  });
}

async function update(id, data, userId) {
  const view = await prisma.savedView.findUnique({ where: { id } });
  if (!view || view.userId !== userId) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('Ansicht nicht gefunden.', 404);
  }
  return prisma.savedView.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name : undefined,
      filters: data.filters !== undefined ? data.filters : undefined,
      isGlobal: data.isGlobal !== undefined ? data.isGlobal : undefined,
    },
  });
}

async function remove(id, userId) {
  const view = await prisma.savedView.findUnique({ where: { id } });
  if (!view || view.userId !== userId) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('Ansicht nicht gefunden.', 404);
  }
  return prisma.savedView.delete({ where: { id } });
}

module.exports = { create, list, update, remove };
