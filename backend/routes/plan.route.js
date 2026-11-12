const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getPlans, getUsage, changePlan } = require('../controllers/plan.controller');

router.get('/', getPlans);               // Public – marketing page can call this
router.get('/usage', protect, getUsage);
router.post('/change', protect, changePlan);

module.exports = router;

