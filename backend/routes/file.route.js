const express = require('express');
const router = express.Router();
const { s3UploadMiddleware } = require('../utils/s3.config');
const {
  uploadMedia,
  deleteMedia,
  listMedia, 
} = require('../controllers/media.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/upload', protect, s3UploadMiddleware, uploadMedia);
router.get('/', protect, listMedia);
router.delete('/:id', protect, deleteMedia);

module.exports = router;