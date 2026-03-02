const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const contractService = require('../services/contract.service');
const { generateContractPdf } = require('../services/contractPdf.service');
const activityService = require('../services/activity.service');
const commentService = require('../services/comment.service');
const prisma = require('../lib/prisma');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// POST /api/contracts — create contract + generate PDF
router.post('/', asyncHandler(async (req, res) => {
  const { companyId, durationMonths, commissionRate, street, streetNumber, zipCode, city, country, paymentBewilligung, paymentFinanzamt } = req.body;

  if (!companyId) return res.status(400).json({ error: 'Firma ist erforderlich.' });
  if (!durationMonths || durationMonths < 1) return res.status(400).json({ error: 'Vertragslaufzeit ist erforderlich.' });
  if (commissionRate === undefined || commissionRate < 0 || commissionRate > 100) return res.status(400).json({ error: 'Prozentsatz muss zwischen 0 und 100 liegen.' });
  if (!street?.trim()) return res.status(400).json({ error: 'Straße ist erforderlich.' });
  if (!streetNumber?.trim()) return res.status(400).json({ error: 'Hausnummer ist erforderlich.' });
  if (!zipCode?.trim()) return res.status(400).json({ error: 'PLZ ist erforderlich.' });
  if (!city?.trim()) return res.status(400).json({ error: 'Stadt ist erforderlich.' });

  const contract = await contractService.create({
    companyId,
    durationMonths: parseInt(durationMonths),
    commissionRate: parseFloat(commissionRate),
    street: street.trim(),
    streetNumber: streetNumber.trim(),
    zipCode: zipCode.trim(),
    city: city.trim(),
    country: country?.trim() || 'Deutschland',
    paymentBewilligung: parseInt(paymentBewilligung) || 50,
    paymentFinanzamt: parseInt(paymentFinanzamt) || 50,
  }, req.user.id);

  // Generate PDF
  const pdfPath = await generateContractPdf(contract);
  await contractService.updatePdfPath(contract.id, pdfPath);

  activityService.log('CONTRACT_CREATED', 'COMPANY', companyId, req.user.id, {
    contractNumber: contract.contractNumber,
    companyName: contract.company?.name,
  }).catch(() => {});

  // Auto-comment on the company
  const commentText = `📄 Vertrag erstellt: ${contract.contractNumber} (${contract.durationMonths} Monate, ${contract.commissionRate}% auf die Bescheinigten Projektkosten)`;
  commentService.create({
    content: commentText,
    entityType: 'COMPANY',
    entityId: companyId,
  }, req.user.id).catch(() => {});

  // Auto-attach the PDF to the company's file list
  const uploadsDir = path.resolve(__dirname, '../../uploads');
  const absPath = path.resolve(uploadsDir, pdfPath);
  const fileSize = fs.existsSync(absPath) ? fs.statSync(absPath).size : 0;
  prisma.attachment.create({
    data: {
      fileName: `Vertrag ${contract.contractNumber.split('-').pop()}.pdf`,
      fileSize,
      mimeType: 'application/pdf',
      path: pdfPath,
      companyId,
      uploadedById: req.user.id,
    },
  }).catch(() => {});

  res.status(201).json({ ...contract, pdfPath });
}));

// GET /api/contracts/company/:companyId — list contracts for a company
router.get('/company/:companyId', asyncHandler(async (req, res) => {
  const contracts = await contractService.getByCompanyId(req.params.companyId);
  res.json(contracts);
}));

// GET /api/contracts/:id — single contract
router.get('/:id', asyncHandler(async (req, res) => {
  const contract = await contractService.getById(req.params.id);
  res.json(contract);
}));

// GET /api/contracts/:id/download — download PDF
router.get('/:id/download', asyncHandler(async (req, res) => {
  const contract = await contractService.getById(req.params.id);
  if (!contract.pdfPath) {
    return res.status(404).json({ error: 'PDF wurde noch nicht generiert.' });
  }
  const uploadsDir = path.resolve(__dirname, '../../uploads');
  const filePath = path.resolve(uploadsDir, contract.pdfPath);
  if (!filePath.startsWith(uploadsDir)) {
    return res.status(400).json({ error: 'Ungültiger Dateipfad.' });
  }
  const seqNum = contract.contractNumber.split('-').pop();
  res.download(filePath, `Vertrag ${seqNum}.pdf`);
}));

module.exports = router;
