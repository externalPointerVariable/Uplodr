const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth.middleware');
const { checkStorageQuota } = require('../middleware/quota.middleware');
const {
  uploadFiles,
  listFiles,
  streamFile,
  downloadFile,
  downloadBatchZip,
  renameFile,
  moveFile,
  toggleStar,
  trashFile,
  restoreFile,
  deletePermanent,
  emptyTrash
} = require('../controllers/file.controller');

// Use memory storage so we control writes via storage.provider.js
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 * 1024 } // 10 GB hard ceiling (quota enforced per-plan)
});

// ─── Upload ───────────────────────────────────────────────────────────────────
// Quota check runs AFTER multer parses the file so req.file.size is available
router.post('/upload', protect, upload.array('files', 50), checkStorageQuota, uploadFiles);
router.post('/upload/single', protect, upload.single('file'), checkStorageQuota, uploadFiles);

// ─── List & Search ────────────────────────────────────────────────────────────
router.get('/', protect, listFiles);

// ─── Streaming / Download ──────────────────────────────────────────────────────
router.get('/stream/:id', protect, streamFile);
router.get('/download/:id', protect, downloadFile);
router.post('/download/batch', protect, downloadBatchZip);

// ─── Mutations ────────────────────────────────────────────────────────────────
router.patch('/:id/rename', protect, renameFile);
router.patch('/:id/move',   protect, moveFile);
router.patch('/:id/star',   protect, toggleStar);

// ─── Trash lifecycle ──────────────────────────────────────────────────────────
router.patch('/:id/trash',   protect, trashFile);
router.patch('/:id/restore', protect, restoreFile);
router.delete('/:id',        protect, deletePermanent);
router.delete('/',           protect, emptyTrash);

module.exports = router;
