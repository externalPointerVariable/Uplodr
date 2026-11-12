const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  createShare,
  listUserShares,
  revokeShare,
  getPublicShareInfo,
  accessPublicShareFile
} = require('../controllers/share.controller');

// Authenticated routes
router.post('/', protect, createShare);
router.get('/', protect, listUserShares);
router.delete('/:id', protect, revokeShare);

// Public share access (no auth required)
router.get('/public/:token', getPublicShareInfo);
router.post('/public/:token', accessPublicShareFile);

module.exports = router;

