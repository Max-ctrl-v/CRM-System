const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const bundesanzeigerService = require('../services/bundesanzeiger.service');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// GET /api/bundesanzeiger/:companyName?refresh=true
router.get('/:companyName', asyncHandler(async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  const result = await bundesanzeigerService.searchJahresabschluss(
    decodeURIComponent(req.params.companyName),
    forceRefresh
  );
  res.json(result);
}));

module.exports = router;
