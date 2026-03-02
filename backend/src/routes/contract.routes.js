const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const contractService = require('../services/contract.service');
const { generateContractPdf } = require('../services/contractPdf.service');
const activityService = require('../services/activity.service');
const authenticate = require('../middleware/auth');
const path = require('path');

router.use(authenticate);

// POST /api/contracts — create contract + generate PDF
router.post('/', asyncHandler(async (req, res) => {
  const { companyId, durationMonths, commissionRate, street, streetNumber, zipCode, city, country } = req.body;

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
  }, req.user.id);

  // Generate PDF
  const pdfPath = await generateContractPdf(contract);
  await contractService.updatePdfPath(contract.id, pdfPath);

  activityService.log('CONTRACT_CREATED', 'COMPANY', companyId, req.user.id, {
    contractNumber: contract.contractNumber,
    companyName: contract.company?.name,
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
  res.download(filePath, `Vertrag-${contract.contractNumber}.pdf`);
}));

module.exports = router;
