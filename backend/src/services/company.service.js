const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

async function getAll(filters = {}) {
  const where = {};
  if (filters.stage) where.pipelineStage = filters.stage;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters.search) {
    where.name = { contains: filters.search };
  }

  return prisma.company.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      contacts: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

async function getById(id) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      contacts: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!company) throw new AppError('Firma nicht gefunden.', 404);
  return company;
}

async function create(data, userId) {
  return prisma.company.create({
    data: {
      name: data.name,
      website: data.website || null,
      city: data.city || null,
      pipelineStage: data.pipelineStage || null,
      assignedToId: data.assignedToId || null,
      createdById: userId,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

async function update(id, data) {
  return prisma.company.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.website !== undefined && { website: data.website || null }),
      ...(data.city !== undefined && { city: data.city || null }),
      ...(data.pipelineStage !== undefined && { pipelineStage: data.pipelineStage }),
      ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId || null }),
      ...(data.eigenkapital !== undefined && { eigenkapital: data.eigenkapital || null }),
      ...(data.verlustvortrag !== undefined && { verlustvortrag: data.verlustvortrag || null }),
      ...(data.gewinnvortrag !== undefined && { gewinnvortrag: data.gewinnvortrag || null }),
      ...(data.expectedRevenue !== undefined && { expectedRevenue: data.expectedRevenue ? parseFloat(data.expectedRevenue) : null }),
      ...(data.uisSchwierigkeiten !== undefined && { uisSchwierigkeiten: !!data.uisSchwierigkeiten }),
      ...(data.uisReason !== undefined && { uisReason: data.uisReason }),
      ...(data.doNotCall !== undefined && { doNotCall: !!data.doNotCall }),
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

async function updateStage(id, stage) {
  const validStages = ['FIRMA_IDENTIFIZIERT', 'FIRMA_KONTAKTIERT', 'VERHANDLUNG', 'CLOSED_WON', 'CLOSED_LOST', null];
  if (!validStages.includes(stage)) {
    throw new AppError('Ungültige Pipeline-Stufe.', 400);
  }
  return prisma.company.update({
    where: { id },
    data: { pipelineStage: stage },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      contacts: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

async function remove(id) {
  return prisma.company.delete({ where: { id } });
}

module.exports = { getAll, getById, create, update, updateStage, remove };
