const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getActivities, getStorageBreakdown } = require('../controllers/analytics.controller');

router.get('/activity', protect, getActivities);
router.get('/storage', protect, getStorageBreakdown);

module.exports = router;

