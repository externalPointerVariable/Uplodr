const express = require('express');
const router = express.Router();
const { s3UploadMiddleware } = require('../utils/s3Config');
const { uploadMedia, deleteMedia } = require('../controllers/mediaController');
const { protect } = require('../middleware/authMiddleware');

router.post(
    '/upload',
    protect, 
    s3UploadMiddleware,
    (error, req, res, next) => {
        if (error) {
            return res.status(400).json({ message: error.message || 'File upload failed.' });
        }
        next();
    },
    uploadMedia 
);

router.delete('/:id', protect, deleteMedia);

module.exports = router;