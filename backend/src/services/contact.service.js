const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');

async function getByCompany(companyId) {
  return prisma.contact.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  });
}

async function getById(id) {
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) throw new AppError('Kontakt nicht gefunden.', 404);
  return contact;
}

async function create(data) {
  return prisma.contact.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      position: data.position || null,
      companyId: data.companyId,
    },
  });
}

async function update(id, data) {
  return prisma.contact.update({
    where: { id },
    data: {
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.position !== undefined && { position: data.position }),
    },
  });
}

async function remove(id) {
  return prisma.contact.delete({ where: { id } });
}

module.exports = { getByCompany, getById, create, update, remove };
