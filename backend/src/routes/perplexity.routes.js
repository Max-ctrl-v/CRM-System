const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const perplexityService = require('../services/perplexity.service');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();
router.use(authenticate);

// POST /api/perplexity/research — research and save to company
router.post('/research', asyncHandler(async (req, res) => {
  const { companyId, companyName, website } = req.body;
  if (!companyName) {
    return res.status(400).json({ error: 'Firmenname erforderlich.' });
  }

  const result = await perplexityService.researchCompany(companyName, website);

  // Save result to company if companyId provided
  if (companyId) {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        perplexityResult: JSON.stringify(result),
        perplexityFetchedAt: new Date(),
      },
    });
  }

  res.json(result);
}));

// GET /api/perplexity/stored/:companyId — get stored result
router.get('/stored/:companyId', asyncHandler(async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { id: req.params.companyId },
    select: { perplexityResult: true, perplexityFetchedAt: true },
  });

  if (!company || !company.perplexityResult) {
    return res.json({ stored: false });
  }

  res.json({
    stored: true,
    ...JSON.parse(company.perplexityResult),
    fetchedAt: company.perplexityFetchedAt,
  });
}));

// POST /api/perplexity/contact-research — research a contact person
router.post('/contact-research', asyncHandler(async (req, res) => {
  const { contactId, contactName, position, companyName } = req.body;
  if (!contactName || !companyName) {
    return res.status(400).json({ error: 'Kontaktname und Firmenname erforderlich.' });
  }

  const result = await perplexityService.researchContact(contactName, position, companyName);

  // Save result to contact if contactId provided
  if (contactId) {
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        perplexityResult: JSON.stringify(result),
        perplexityFetchedAt: new Date(),
      },
    });
  }

  res.json(result);
}));

// GET /api/perplexity/contact-stored/:contactId — get stored contact result
router.get('/contact-stored/:contactId', asyncHandler(async (req, res) => {
  const contact = await prisma.contact.findUnique({
    where: { id: req.params.contactId },
    select: { perplexityResult: true, perplexityFetchedAt: true },
  });

  if (!contact || !contact.perplexityResult) {
    return res.json({ stored: false });
  }

  res.json({
    stored: true,
    ...JSON.parse(contact.perplexityResult),
    fetchedAt: contact.perplexityFetchedAt,
  });
}));

// POST /api/perplexity/free-search — free-form Perplexity query
router.post('/free-search', asyncHandler(async (req, res) => {
  const { query } = req.body;
  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Suchanfrage erforderlich.' });
  }

  const result = await perplexityService.freeSearch(query.trim());
  res.json(result);
}));

// POST /api/perplexity/check-uis — check UiS status + detect HQ city
router.post('/check-uis', asyncHandler(async (req, res) => {
  const { companyId, companyName, website } = req.body;
  if (!companyName) {
    return res.status(400).json({ error: 'Firmenname erforderlich.' });
  }

  const result = await perplexityService.checkUiS(companyName, website);

  // Save result to company if companyId provided
  if (companyId) {
    const updateData = {
      uisSchwierigkeiten: result.uisSchwierigkeiten,
      uisReason: result.uisReason,
    };
    // Auto-set city if detected and company doesn't have one yet
    if (result.city) {
      const existing = await prisma.company.findUnique({ where: { id: companyId }, select: { city: true } });
      if (!existing?.city) {
        updateData.city = result.city;
      }
    }
    await prisma.company.update({
      where: { id: companyId },
      data: updateData,
    });
  }

  res.json(result);
}));

module.exports = router;
