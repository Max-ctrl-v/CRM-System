const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const contactService = require('../services/contact.service');
const authenticate = require('../middleware/auth');
const activityService = require('../services/activity.service');

router.use(authenticate);

// GET /api/contacts?companyId=xxx
router.get('/', asyncHandler(async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ error: 'companyId erforderlich.' });
  const contacts = await contactService.getByCompany(companyId);
  res.json(contacts);
}));

// GET /api/contacts/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const contact = await contactService.getById(req.params.id);
  res.json(contact);
}));

// POST /api/contacts
router.post('/', asyncHandler(async (req, res) => {
  const { firstName, lastName, companyId } = req.body;
  if (!firstName?.trim() || !lastName?.trim() || !companyId) {
    return res.status(400).json({ error: 'Vorname, Nachname und Firma erforderlich.' });
  }
  if (firstName.trim().length > 100 || lastName.trim().length > 100) {
    return res.status(400).json({ error: 'Name zu lang (max. 100 Zeichen).' });
  }
  const contact = await contactService.create(req.body);
  activityService.log('CONTACT_ADDED', 'COMPANY', contact.companyId, req.user.id, { contactName: `${contact.firstName} ${contact.lastName}` }).catch(() => {});
  res.status(201).json(contact);
}));

// PUT /api/contacts/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const { firstName, lastName } = req.body;
  if (firstName !== undefined && !firstName?.trim()) {
    return res.status(400).json({ error: 'Vorname darf nicht leer sein.' });
  }
  if (lastName !== undefined && !lastName?.trim()) {
    return res.status(400).json({ error: 'Nachname darf nicht leer sein.' });
  }
  const contact = await contactService.update(req.params.id, req.body);
  res.json(contact);
}));

// DELETE /api/contacts/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const contact = await contactService.getById(req.params.id);
  // Only admin or the company owner can delete contacts
  if (req.user.role !== 'ADMIN') {
    const prisma = require('../lib/prisma');
    const company = await prisma.company.findUnique({ where: { id: contact.companyId }, select: { assignedToId: true, createdById: true } });
    if (company && company.assignedToId !== req.user.id && company.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieses Kontakts.' });
    }
  }
  await contactService.remove(req.params.id);
  res.json({ message: 'Kontakt gelöscht.' });
}));

module.exports = router;
