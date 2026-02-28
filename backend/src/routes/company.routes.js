const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const companyService = require('../services/company.service');
const authenticate = require('../middleware/auth');
const { auditLog } = require('../utils/auditLog');
const activityService = require('../services/activity.service');

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

// POST /api/companies/bulk — bulk stage, assign, or delete
router.post('/bulk', asyncHandler(async (req, res) => {
  const { ids, action, stage, assignedToId } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Keine Firmen ausgewählt.' });
  }
  if (action === 'stage' && stage !== undefined) {
    await companyService.bulkUpdateStage(ids, stage === 'null' ? null : stage);
    return res.json({ message: `${ids.length} Firmen aktualisiert.` });
  }
  if (action === 'assign' && assignedToId !== undefined) {
    await companyService.bulkAssign(ids, assignedToId || null);
    return res.json({ message: `${ids.length} Firmen zugewiesen.` });
  }
  if (action === 'delete') {
    await companyService.bulkDelete(ids);
    return res.json({ message: `${ids.length} Firmen gelöscht.` });
  }
  return res.status(400).json({ error: 'Ungültige Aktion.' });
}));

// POST /api/companies
router.post('/', asyncHandler(async (req, res) => {
  const company = await companyService.create(req.body, req.user.id);
  activityService.log('COMPANY_CREATED', 'COMPANY', company.id, req.user.id, { companyName: company.name }).catch(() => {});
  res.status(201).json(company);
}));

// PUT /api/companies/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const company = await companyService.update(req.params.id, req.body);
  auditLog('COMPANY_UPDATE', req.user.id, { companyId: req.params.id });
  activityService.log('COMPANY_UPDATED', 'COMPANY', req.params.id, req.user.id, { companyName: company.name }).catch(() => {});
  res.json(company);
}));

// PATCH /api/companies/:id/stage
router.patch('/:id/stage', asyncHandler(async (req, res) => {
  const { stage } = req.body;
  if (stage === undefined) return res.status(400).json({ error: 'Pipeline-Stufe erforderlich.' });
  const current = await companyService.getById(req.params.id);
  const company = await companyService.updateStage(req.params.id, stage);
  auditLog('STAGE_CHANGE', req.user.id, { companyId: req.params.id, stage });
  activityService.log('STAGE_CHANGE', 'COMPANY', req.params.id, req.user.id, {
    oldStage: current.pipelineStage,
    newStage: stage,
    companyName: company.name,
  }).catch(() => {});
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
