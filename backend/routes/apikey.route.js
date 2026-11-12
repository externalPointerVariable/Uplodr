const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { createApiKey, listApiKeys, revokeApiKey } = require('../controllers/apikey.controller');

router.get('/', protect, listApiKeys);
router.post('/', protect, createApiKey);
router.delete('/:id', protect, revokeApiKey);

module.exports = router;

