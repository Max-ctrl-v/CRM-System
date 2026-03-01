const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function upload(file, companyId, userId) {
  return prisma.attachment.create({
    data: {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      path: file.filename,
      companyId,
      uploadedById: userId,
    },
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
  });
}

async function list(companyId) {
  return prisma.attachment.findMany({
    where: { companyId },
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function getById(id) {
  return prisma.attachment.findUnique({
    where: { id },
  });
}

async function remove(id, userId, userRole) {
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('Datei nicht gefunden.', 404);
  }

  // Only uploader or admin can delete
  if (userRole !== 'ADMIN' && attachment.uploadedById !== userId) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('Keine Berechtigung zum Löschen.', 403);
  }

  // Delete file from disk
  const filePath = path.join(UPLOADS_DIR, attachment.path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return prisma.attachment.delete({ where: { id } });
}

module.exports = { upload, list, getById, remove, UPLOADS_DIR };
