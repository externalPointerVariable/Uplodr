const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const File = require('../models/file.model');
const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const storageProvider = require('../utils/storage.provider');
const { formatBytes } = require('../config/plans.config');

// Upload single or multiple files
exports.uploadFiles = async (req, res) => {
  try {
    const rawFiles = req.files && req.files.length ? req.files : req.file ? [req.file] : [];
    if (!rawFiles.length) {
      return res.status(400).json({ message: 'No file received for upload' });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const targetFolder = (req.body.folder || '/').trim();
    const uploadedRecords = [];
    let totalBytesAdded = 0;

    for (const file of rawFiles) {
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      
      // Persist via storage provider
      const stored = await storageProvider.saveFile({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        userId: String(userId)
      });

      const newFile = await File.create({
        user: userId,
        file_name: file.originalname,
        file_size: file.size,
        file_mimetype: file.mimetype || 'application/octet-stream',
        file_extension: ext,
        file_category: stored.category,
        file_key: stored.key,
        file_location: stored.location,
        folder: targetFolder,
        isStarred: false,
        isTrashed: false,
        downloadCount: 0
      });

      uploadedRecords.push(newFile);
      totalBytesAdded += file.size;
    }

    // Update user's storage quota consumption
    const newStorageUsed = Math.max(0, (user.storageUsed || 0) + totalBytesAdded);
    await User.findByIdAndUpdate(userId, { storageUsed: newStorageUsed });

    // Record activity
    const actionDesc = uploadedRecords.length === 1 
      ? `Uploaded ${uploadedRecords[0].file_name} (${formatBytes(totalBytesAdded)})`
      : `Batch uploaded ${uploadedRecords.length} files (${formatBytes(totalBytesAdded)})`;

    await Activity.create({
      user: userId,
      action: 'FILE_UPLOAD',
      targetName: uploadedRecords[0].file_name,
      details: actionDesc
    }).catch(() => {});

    res.status(201).json({
      message: 'Upload successful',
      files: uploadedRecords,
      totalBytesAdded,
      currentStorageUsed: newStorageUsed
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: error.message || 'Server error during upload' });
  }
};

// List files with rich filtering, search, and sorting
exports.listFiles = async (req, res) => {
  try {
    const userId = req.user._id;
    const { folder, category, starred, trashed, search, sort } = req.query;

    const query = { user: userId };

    // Trash state filter
    if (trashed === 'true') {
      query.isTrashed = true;
    } else {
      query.isTrashed = false;
      // Folder filtering only applies when not viewing Trash or Starred
      if (starred !== 'true' && category !== 'all' && !category && !search) {
        if (folder !== undefined) {
          query.folder = folder || '/';
        }
      }
    }

    // Category filter
    if (category && category.toLowerCase() !== 'all') {
      query.file_category = category.toLowerCase();
    }

    // Starred filter
    if (starred === 'true') {
      query.isStarred = true;
    }

    // Search filter
    if (search && search.trim()) {
      query.file_name = { $regex: search.trim(), $options: 'i' };
    }

    let files = await File.find(query);

    // Sorting
    files.sort((a, b) => {
      switch (sort) {
        case 'name_asc':
          return (a.file_name || '').localeCompare(b.file_name || '');
        case 'name_desc':
          return (b.file_name || '').localeCompare(a.file_name || '');
        case 'size_desc':
          return (b.file_size || 0) - (a.file_size || 0);
        case 'size_asc':
          return (a.file_size || 0) - (b.file_size || 0);
        case 'date_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'date_desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    res.json(files);
  } catch (error) {
    console.error('List Files Error:', error);
    res.status(500).json({ message: 'Failed to retrieve files' });
  }
};

// Stream file with range support for media players and inline previews
exports.streamFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const localPath = storageProvider.getLocalFilePath(file.file_key);

    if (localPath) {
      const stat = fs.statSync(localPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(localPath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': file.file_mimetype || 'application/octet-stream',
        };
        res.writeHead(206, head);
        fileStream.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': file.file_mimetype || 'application/octet-stream',
          'Accept-Ranges': 'bytes'
        };
        res.writeHead(200, head);
        fs.createReadStream(localPath).pipe(res);
      }
      return;
    }

    // S3 or fallback stream
    const { stream, size } = await storageProvider.getFileStream(file.file_key);
    res.setHeader('Content-Type', file.file_mimetype || 'application/octet-stream');
    if (size) res.setHeader('Content-Length', size);
    res.setHeader('Accept-Ranges', 'bytes');
    stream.pipe(res);
  } catch (error) {
    console.error('Stream Error:', error);
    res.status(500).json({ message: 'Error streaming file' });
  }
};

// Download file with proper Content-Disposition attachment header
exports.downloadFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Increment download count
    file.downloadCount = (file.downloadCount || 0) + 1;
    await file.save().catch(() => {});

    const localPath = storageProvider.getLocalFilePath(file.file_key);
    const safeFilename = encodeURIComponent(file.file_name);

    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', file.file_mimetype || 'application/octet-stream');

    if (localPath) {
      const filestream = fs.createReadStream(localPath);
      filestream.pipe(res);
      return;
    }

    const { stream } = await storageProvider.getFileStream(file.file_key);
    stream.pipe(res);
  } catch (error) {
    console.error('Download Error:', error);
    res.status(500).json({ message: 'Error downloading file' });
  }
};

// Batch download multiple files or entire folder as a dynamically compressed ZIP
exports.downloadBatchZip = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fileIds, folder } = req.body;

    let files = [];
    let archiveName = 'uplodr_files.zip';

    if (Array.isArray(fileIds) && fileIds.length > 0) {
      files = await File.find({ _id: { $in: fileIds }, user: userId, isTrashed: false });
    } else if (folder) {
      files = await File.find({ user: userId, folder, isTrashed: false });
      const folderSegment = folder.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/^_+|_+$/g, '');
      archiveName = `uplodr_${folderSegment || 'root'}.zip`;
    }

    if (!files.length) {
      return res.status(404).json({ message: 'No files found to download' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => {
      console.error('Archiver Error:', err);
      if (!res.headersSent) res.status(500).send({ message: err.message });
    });

    archive.pipe(res);

    for (const f of files) {
      const localPath = storageProvider.getLocalFilePath(f.file_key);
      if (localPath && fs.existsSync(localPath)) {
        archive.file(localPath, { name: f.file_name });
      } else {
        try {
          const { stream } = await storageProvider.getFileStream(f.file_key);
          archive.append(stream, { name: f.file_name });
        } catch (streamErr) {
          console.warn(`Skipping missing file ${f.file_name}:`, streamErr.message);
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Batch ZIP Error:', error);
    if (!res.headersSent) res.status(500).json({ message: 'Failed to generate ZIP' });
  }
};

// Rename file
exports.renameFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;

    if (!newName || !newName.trim()) {
      return res.status(400).json({ message: 'New file name is required' });
    }

    const file = await File.findOne({ _id: id, user: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const cleanName = newName.trim();
    const ext = path.extname(cleanName).toLowerCase().replace('.', '');
    const category = storageProvider.getFileCategory(file.file_mimetype, cleanName);

    file.file_name = cleanName;
    file.file_extension = ext;
    file.file_category = category;
    await file.save();

    await Activity.create({
      user: req.user._id,
      action: 'FILE_RENAME',
      targetName: cleanName,
      details: `Renamed to ${cleanName}`
    }).catch(() => {});

    res.json({ message: 'File renamed successfully', file });
  } catch (error) {
    console.error('Rename Error:', error);
    res.status(500).json({ message: 'Failed to rename file' });
  }
};

// Move file to another folder
exports.moveFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetFolder } = req.body;

    const folderPath = (targetFolder || '/').trim();
    const file = await File.findOne({ _id: id, user: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    file.folder = folderPath;
    await file.save();

    res.json({ message: `Moved to ${folderPath}`, file });
  } catch (error) {
    console.error('Move File Error:', error);
    res.status(500).json({ message: 'Failed to move file' });
  }
};

// Toggle Star/Favorite
exports.toggleStar = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, user: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    file.isStarred = !file.isStarred;
    await file.save();

    await Activity.create({
      user: req.user._id,
      action: 'FILE_STAR',
      targetName: file.file_name,
      details: file.isStarred ? 'Added to Starred' : 'Removed from Starred'
    }).catch(() => {});

    res.json({ message: file.isStarred ? 'Starred' : 'Unstarred', isStarred: file.isStarred });
  } catch (error) {
    console.error('Toggle Star Error:', error);
    res.status(500).json({ message: 'Failed to toggle star' });
  }
};

// Move file to Trash (Soft Delete)
exports.trashFile = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, user: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    file.isTrashed = true;
    file.trashedAt = new Date().toISOString();
    await file.save();

    await Activity.create({
      user: req.user._id,
      action: 'FILE_DELETE',
      targetName: file.file_name,
      details: 'Moved to Trash'
    }).catch(() => {});

    res.json({ message: 'File moved to Trash', file });
  } catch (error) {
    console.error('Trash File Error:', error);
    res.status(500).json({ message: 'Failed to trash file' });
  }
};

// Restore file from Trash
exports.restoreFile = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, user: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File not found in trash' });
    }

    file.isTrashed = false;
    file.trashedAt = null;
    await file.save();

    await Activity.create({
      user: req.user._id,
      action: 'FILE_RESTORE',
      targetName: file.file_name,
      details: 'Restored from Trash'
    }).catch(() => {});

    res.json({ message: 'File restored', file });
  } catch (error) {
    console.error('Restore File Error:', error);
    res.status(500).json({ message: 'Failed to restore file' });
  }
};

// Permanently delete file and reclaim storage space
exports.deletePermanent = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, user: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // 1. Delete from physical storage
    await storageProvider.deleteStoredFile(file.file_key);

    // 2. Decrement user storageUsed
    const user = await User.findById(req.user._id);
    if (user) {
      const reclaimed = file.file_size || 0;
      const updatedUsed = Math.max(0, (user.storageUsed || 0) - reclaimed);
      await User.findByIdAndUpdate(user._id, { storageUsed: updatedUsed });
    }

    // 3. Remove DB record
    await File.findByIdAndDelete(file._id);

    await Activity.create({
      user: req.user._id,
      action: 'FILE_DELETE',
      targetName: file.file_name,
      details: 'Permanently deleted from storage'
    }).catch(() => {});

    res.json({ message: 'File permanently deleted and storage reclaimed' });
  } catch (error) {
    console.error('Permanent Delete Error:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

// Empty user's trash completely
exports.emptyTrash = async (req, res) => {
  try {
    const trashedFiles = await File.find({ user: req.user._id, isTrashed: true });
    if (!trashedFiles.length) {
      return res.json({ message: 'Trash is already empty', deletedCount: 0 });
    }

    let totalBytesReclaimed = 0;
    for (const f of trashedFiles) {
      await storageProvider.deleteStoredFile(f.file_key);
      await File.findByIdAndDelete(f._id);
      totalBytesReclaimed += f.file_size || 0;
    }

    const user = await User.findById(req.user._id);
    if (user) {
      const updatedUsed = Math.max(0, (user.storageUsed || 0) - totalBytesReclaimed);
      await User.findByIdAndUpdate(user._id, { storageUsed: updatedUsed });
    }

    res.json({
      message: `Emptied trash (${trashedFiles.length} files removed, ${formatBytes(totalBytesReclaimed)} reclaimed)`,
      deletedCount: trashedFiles.length,
      bytesReclaimed: totalBytesReclaimed
    });
  } catch (error) {
    console.error('Empty Trash Error:', error);
    res.status(500).json({ message: 'Failed to empty trash' });
  }
};

