const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const bundesanzeigerService = require('../services/bundesanzeiger.service');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// GET /api/bundesanzeiger/:companyName
router.get('/:companyName', asyncHandler(async (req, res) => {
  const result = await bundesanzeigerService.searchJahresabschluss(
    decodeURIComponent(req.params.companyName)
  );
  res.json(result);
}));

module.exports = router;
