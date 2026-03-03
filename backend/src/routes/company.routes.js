const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const companyService = require('../services/company.service');
const authenticate = require('../middleware/auth');
const activityService = require('../services/activity.service');
const scoringService = require('../services/scoring.service');
const nextActionService = require('../services/nextAction.service');
const similarityService = require('../services/similarity.service');
const pick = require('../utils/pick');
const prisma = require('../lib/prisma');

// Allowed fields for mass assignment protection
const COMPANY_CREATE_FIELDS = ['name', 'website', 'city', 'pipelineStage', 'assignedToId', 'adminPipeline', 'contacts', 'expectedRevenue'];
const COMPANY_UPDATE_FIELDS = [
  'name', 'website', 'city', 'pipelineStage', 'assignedToId', 'adminPipeline',
  'eigenkapital', 'verlustvortrag', 'gewinnvortrag', 'expectedRevenue',
  'uisSchwierigkeiten', 'uisReason', 'doNotCall', 'isFavorite',
  'meetingStatus', 'meetingDate', 'meetingFollowUpAt',
];

/** IDOR: assert non-admin user can modify this company */
async function assertWriteAccess(user, companyId) {
  if (user.role === 'ADMIN') return;
  const company = await companyService.getById(companyId);
  if (company.assignedTo?.role === 'ADMIN') {
    return { error: 'Kein Zugriff auf diese Firma.', status: 403 };
  }
  if (company.assignedToId && company.assignedToId !== user.id && company.createdById !== user.id) {
    return { error: 'Keine Berechtigung zum Bearbeiten.', status: 403 };
  }
  return null;
}

router.use(authenticate);

// GET /api/companies
router.get('/', asyncHandler(async (req, res) => {
  const { stage, assignedToId, search } = req.query;
  const companies = await companyService.getAll({ stage, assignedToId, search }, req.user);
  res.json(companies);
}));

// GET /api/companies/scores — batch scores (MUST be before /:id)
router.get('/scores', asyncHandler(async (req, res) => {
  const { ids } = req.query;
  if (!ids) return res.json({});
  const companyIds = ids.split(',').filter(Boolean);
  const scores = await scoringService.batchScores(companyIds);
  res.json(scores);
}));

// GET /api/companies/next-actions — batch next actions (MUST be before /:id)
router.get('/next-actions', asyncHandler(async (req, res) => {
  const { ids } = req.query;
  if (!ids) return res.json({});
  const companyIds = ids.split(',').filter(Boolean);
  const actions = await nextActionService.batchSuggest(companyIds);
  res.json(actions);
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

// POST /api/companies/import — CSV bulk import
router.post('/import', asyncHandler(async (req, res) => {
  const { rows, mapping } = req.body;
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'Keine Daten zum Import.' });
  }
  if (rows.length > 500) {
    return res.status(400).json({ error: 'Maximal 500 Firmen pro Import.' });
  }

  const results = { created: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const name = row[mapping.name];
      if (!name?.trim()) {
        results.errors.push({ row: i + 1, error: 'Name fehlt' });
        continue;
      }
      await companyService.create({
        name: name.trim(),
        website: row[mapping.website] || undefined,
        city: row[mapping.city] || undefined,
        expectedRevenue: mapping.revenue ? parseFloat(row[mapping.revenue]) || undefined : undefined,
      }, req.user.id);
      results.created++;
    } catch (err) {
      results.errors.push({ row: i + 1, error: err.message });
    }
  }

  activityService.log('BULK_IMPORT', 'COMPANY', 'bulk', req.user.id, { count: results.created }).catch(() => {});
  res.json(results);
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
  const { name } = req.body;
  if (!name || !name.trim() || name.trim().length > 255) {
    return res.status(400).json({ error: 'Firmenname ist erforderlich (max. 255 Zeichen).' });
  }
  const safeData = pick(req.body, COMPANY_CREATE_FIELDS);
  const company = await companyService.create(safeData, req.user.id);
  activityService.log('COMPANY_CREATED', 'COMPANY', company.id, req.user.id, { companyName: company.name }).catch(() => {});
  res.status(201).json(company);
}));

// PUT /api/companies/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const denied = await assertWriteAccess(req.user, req.params.id);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const safeData = pick(req.body, COMPANY_UPDATE_FIELDS);
  const company = await companyService.update(req.params.id, safeData);
  activityService.log('COMPANY_UPDATED', 'COMPANY', req.params.id, req.user.id, { companyName: company.name }).catch(() => {});
  res.json(company);
}));

// PATCH /api/companies/:id/stage
router.patch('/:id/stage', asyncHandler(async (req, res) => {
  const { stage } = req.body;
  if (stage === undefined) return res.status(400).json({ error: 'Pipeline-Stufe erforderlich.' });

  const denied = await assertWriteAccess(req.user, req.params.id);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const current = await companyService.getById(req.params.id);
  const company = await companyService.updateStage(req.params.id, stage);
  activityService.log('STAGE_CHANGE', 'COMPANY', req.params.id, req.user.id, {
    oldStage: current.pipelineStage,
    newStage: stage,
    companyName: company.name,
  }).catch(() => {});
  res.json(company);
}));

// PATCH /api/companies/:id/do-not-call
router.patch('/:id/do-not-call', asyncHandler(async (req, res) => {
  const denied = await assertWriteAccess(req.user, req.params.id);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const { doNotCall } = req.body;
  const company = await companyService.update(req.params.id, { doNotCall: !!doNotCall });
  res.json(company);
}));

// PATCH /api/companies/:id/favorite
router.patch('/:id/favorite', asyncHandler(async (req, res) => {
  const denied = await assertWriteAccess(req.user, req.params.id);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const { isFavorite } = req.body;
  const company = await companyService.update(req.params.id, { isFavorite: !!isFavorite });
  res.json(company);
}));

// PATCH /api/companies/:id/meeting
router.patch('/:id/meeting', asyncHandler(async (req, res) => {
  const denied = await assertWriteAccess(req.user, req.params.id);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const { meetingStatus, meetingDate } = req.body;
  const updateData = {};

  if (meetingStatus === 'MEETING_SET') {
    if (!meetingDate) return res.status(400).json({ error: 'Termindatum erforderlich.' });
    updateData.meetingStatus = 'MEETING_SET';
    updateData.meetingDate = meetingDate;
    updateData.meetingFollowUpAt = null;
  } else if (meetingStatus === 'MEETING_DONE') {
    const current = await companyService.getById(req.params.id);
    const baseDate = current.meetingDate || new Date();
    const followUp = new Date(baseDate);
    followUp.setDate(followUp.getDate() + 14);
    updateData.meetingStatus = 'MEETING_DONE';
    updateData.meetingFollowUpAt = followUp.toISOString();
  } else if (meetingStatus === null) {
    updateData.meetingStatus = null;
    updateData.meetingDate = null;
    updateData.meetingFollowUpAt = null;
  } else {
    return res.status(400).json({ error: 'Ungültiger Meeting-Status.' });
  }

  const company = await companyService.update(req.params.id, updateData);
  activityService.log('MEETING_STATUS_CHANGED', 'COMPANY', req.params.id, req.user.id, {
    meetingStatus, companyName: company.name,
  }).catch(() => {});
  res.json(company);
}));

// GET /api/companies/:id/score
router.get('/:id/score', asyncHandler(async (req, res) => {
  const score = await scoringService.calculateScore(req.params.id);
  res.json({ score });
}));

// GET /api/companies/:id/next-action
router.get('/:id/next-action', asyncHandler(async (req, res) => {
  const suggestion = await nextActionService.suggest(req.params.id);
  res.json(suggestion);
}));

// GET /api/companies/:id/similar
router.get('/:id/similar', asyncHandler(async (req, res) => {
  const similar = await similarityService.findSimilar(req.params.id);
  res.json(similar);
}));

// DELETE /api/companies/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await companyService.remove(req.params.id);
  res.json({ message: 'Firma gelöscht.' });
}));

module.exports = router;
