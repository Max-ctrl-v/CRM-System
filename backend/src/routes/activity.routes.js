const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const activityService = require('../services/activity.service');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// GET /api/activities?entityType=COMPANY&entityId=xxx&limit=50
router.get('/', asyncHandler(async (req, res) => {
  const { entityType, entityId, limit } = req.query;
  if (entityType && entityId) {
    const activities = await activityService.getByEntity(entityType, entityId, parseInt(limit) || 50);
    return res.json(activities);
  }
  const activities = await activityService.getRecent(parseInt(limit) || 20);
  res.json(activities);
}));

module.exports = router;
