const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const contactService = require('../services/contact.service');
const authenticate = require('../middleware/auth');

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
  if (!firstName || !lastName || !companyId) {
    return res.status(400).json({ error: 'Vorname, Nachname und Firma erforderlich.' });
  }
  const contact = await contactService.create(req.body);
  res.status(201).json(contact);
}));

// PUT /api/contacts/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const contact = await contactService.update(req.params.id, req.body);
  res.json(contact);
}));

// DELETE /api/contacts/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await contactService.remove(req.params.id);
  res.json({ message: 'Kontakt gelöscht.' });
}));

module.exports = router;
