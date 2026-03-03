const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');

async function generateContractNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.contract.count({
    where: {
      contractNumber: { startsWith: `NV-${year}-` },
    },
  });
  const seq = String(count + 1).padStart(4, '0');
  return `NV-${year}-${seq}`;
}

async function create(data, userId) {
  const contractNumber = await generateContractNumber();

  const contract = await prisma.contract.create({
    data: {
      contractNumber,
      durationMonths: data.durationMonths,
      commissionRate: data.commissionRate,
      foerderquote: data.foerderquote,
      street: data.street,
      streetNumber: data.streetNumber,
      zipCode: data.zipCode,
      city: data.city,
      country: data.country || 'Deutschland',
      paymentBewilligung: data.paymentBewilligung ?? 50,
      paymentFinanzamt: data.paymentFinanzamt ?? 50,
      companyId: data.companyId,
      createdById: userId,
    },
    include: {
      company: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return contract;
}

async function getByCompanyId(companyId) {
  return prisma.contract.findMany({
    where: { companyId },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function getById(id) {
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          website: true,
          contacts: { select: { firstName: true, lastName: true, position: true, email: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!contract) throw new AppError('Vertrag nicht gefunden.', 404);
  return contract;
}

async function updatePdfPath(id, pdfPath) {
  return prisma.contract.update({
    where: { id },
    data: { pdfPath, pdfGeneratedAt: new Date() },
  });
}

module.exports = { create, getByCompanyId, getById, updatePdfPath };
