const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { createFolder, listFolders, deleteFolder } = require('../controllers/folder.controller');

router.get('/', protect, listFolders);
router.post('/', protect, createFolder);
router.delete('/:id', protect, deleteFolder);

module.exports = router;

