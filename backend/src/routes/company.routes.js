const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const companyService = require('../services/company.service');
const authenticate = require('../middleware/auth');
const { auditLog } = require('../utils/auditLog');

router.use(authenticate);

// GET /api/companies
router.get('/', asyncHandler(async (req, res) => {
  const { stage, assignedToId, search } = req.query;
  const companies = await companyService.getAll({ stage, assignedToId, search }, req.user);
  res.json(companies);
}));

// GET /api/companies/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const company = await companyService.getById(req.params.id);
  // Non-admin users cannot view companies assigned to an admin
  if (req.user.role !== 'ADMIN' && company.assignedTo?.role === 'ADMIN') {
    return res.status(403).json({ error: 'Kein Zugriff auf diese Firma.' });
  }
  res.json(company);
}));

// POST /api/companies
router.post('/', asyncHandler(async (req, res) => {
  const company = await companyService.create(req.body, req.user.id);
  res.status(201).json(company);
}));

// PUT /api/companies/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const company = await companyService.update(req.params.id, req.body);
  auditLog('COMPANY_UPDATE', req.user.id, { companyId: req.params.id });
  res.json(company);
}));

// PATCH /api/companies/:id/stage
router.patch('/:id/stage', asyncHandler(async (req, res) => {
  const { stage } = req.body;
  if (stage === undefined) return res.status(400).json({ error: 'Pipeline-Stufe erforderlich.' });
  const company = await companyService.updateStage(req.params.id, stage);
  auditLog('STAGE_CHANGE', req.user.id, { companyId: req.params.id, stage });
  res.json(company);
}));

// PATCH /api/companies/:id/do-not-call
router.patch('/:id/do-not-call', asyncHandler(async (req, res) => {
  const { doNotCall } = req.body;
  const company = await companyService.update(req.params.id, { doNotCall: !!doNotCall });
  res.json(company);
}));

// DELETE /api/companies/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await companyService.remove(req.params.id);
  auditLog('COMPANY_DELETE', req.user.id, { companyId: req.params.id });
  res.json({ message: 'Firma gelöscht.' });
}));

module.exports = router;
