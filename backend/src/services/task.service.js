const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');

const TASK_INCLUDE = {
  company: { select: { id: true, name: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
};

async function getAll(filters = {}) {
  const where = {};
  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.contactId) where.contactId = filters.contactId;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters.done !== undefined) where.done = filters.done === 'true';

  return prisma.task.findMany({
    where,
    include: TASK_INCLUDE,
    orderBy: [
      { done: 'asc' },
      { dueDate: 'asc' },
      { createdAt: 'desc' },
    ],
  });
}

async function getOverdue() {
  return prisma.task.findMany({
    where: {
      done: false,
      dueDate: { lt: new Date() },
    },
    include: TASK_INCLUDE,
    orderBy: { dueDate: 'asc' },
  });
}

async function getById(id) {
  const task = await prisma.task.findUnique({ where: { id }, include: TASK_INCLUDE });
  if (!task) throw new AppError('Aufgabe nicht gefunden.', 404);
  return task;
}

async function create(data, userId) {
  if (!data.title || !data.title.trim()) {
    throw new AppError('Titel ist erforderlich.', 400);
  }
  return prisma.task.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      companyId: data.companyId || null,
      contactId: data.contactId || null,
      createdById: userId,
      assignedToId: data.assignedToId || null,
    },
    include: TASK_INCLUDE,
  });
}

async function update(id, data) {
  await getById(id);
  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId || null;
  if (data.companyId !== undefined) updateData.companyId = data.companyId || null;
  if (data.contactId !== undefined) updateData.contactId = data.contactId || null;

  return prisma.task.update({ where: { id }, data: updateData, include: TASK_INCLUDE });
}

async function toggleDone(id, done) {
  await getById(id);
  return prisma.task.update({
    where: { id },
    data: {
      done: !!done,
      doneAt: done ? new Date() : null,
    },
    include: TASK_INCLUDE,
  });
}

async function remove(id) {
  await getById(id);
  return prisma.task.delete({ where: { id } });
}

module.exports = { getAll, getOverdue, getById, create, update, toggleDone, remove };
