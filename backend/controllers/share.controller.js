const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const Share = require('../models/share.model');
const File = require('../models/file.model');
const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const storageProvider = require('../utils/storage.provider');

// Create share link for a file
exports.createShare = async (req, res) => {
  try {
    const { fileId, accessLevel = 'download', password, expiresInHours } = req.body;

    const file = await File.findOne({ _id: fileId, user: req.user._id, isTrashed: false });
    if (!file) {
      return res.status(404).json({ message: 'File not found or cannot be shared' });
    }

    const token = 's_' + crypto.randomBytes(16).toString('hex');
    let hasPassword = false;
    let passwordHash = null;

    if (password && password.trim()) {
      hasPassword = true;
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    let expiresAt = null;
    if (expiresInHours && Number(expiresInHours) > 0) {
      expiresAt = new Date(Date.now() + Number(expiresInHours) * 3600 * 1000).toISOString();
    }

    const share = await Share.create({
      user: req.user._id,
      file: file._id,
      token,
      accessLevel: accessLevel === 'view' ? 'view' : 'download',
      hasPassword,
      passwordHash,
      expiresAt,
      viewCount: 0,
      downloadCount: 0,
      isActive: true
    });

    await Activity.create({
      user: req.user._id,
      action: 'SHARE_CREATED',
      targetName: file.file_name,
      details: `Generated public share link with access "${share.accessLevel}"`
    }).catch(() => {});

    res.status(201).json({
      message: 'Share link created successfully',
      share: {
        _id: share._id,
        token: share.token,
        accessLevel: share.accessLevel,
        hasPassword: share.hasPassword,
        expiresAt: share.expiresAt,
        createdAt: share.createdAt
      }
    });
  } catch (error) {
    console.error('Create Share Error:', error);
    res.status(500).json({ message: 'Failed to create share link' });
  }
};

// List user's active shares
exports.listUserShares = async (req, res) => {
  try {
    const shares = await Share.find({ user: req.user._id, isActive: true });
    
    // Attach file details
    const result = [];
    for (const s of shares) {
      const file = await File.findById(s.file);
      result.push({
        ...s.toObject(),
        fileName: file ? file.file_name : 'Deleted file',
        fileSize: file ? file.file_size : 0,
        fileCategory: file ? file.file_category : 'other',
        isExpired: s.expiresAt ? new Date(s.expiresAt) < new Date() : false
      });
    }

    res.json(result);
  } catch (error) {
    console.error('List Shares Error:', error);
    res.status(500).json({ message: 'Failed to retrieve share links' });
  }
};

// Revoke a share link
exports.revokeShare = async (req, res) => {
  try {
    const share = await Share.findOne({ _id: req.params.id, user: req.user._id });
    if (!share) {
      return res.status(404).json({ message: 'Share link not found' });
    }

    share.isActive = false;
    await share.save();

    await Activity.create({
      user: req.user._id,
      action: 'SHARE_REVOKED',
      targetName: share.token,
      details: 'Revoked share link'
    }).catch(() => {});

    res.json({ message: 'Share link revoked' });
  } catch (error) {
    console.error('Revoke Share Error:', error);
    res.status(500).json({ message: 'Failed to revoke share link' });
  }
};

// Public endpoint: retrieve shared file info without downloading
exports.getPublicShareInfo = async (req, res) => {
  try {
    const { token } = req.params;
    const share = await Share.findOne({ token, isActive: true });

    if (!share) {
      return res.status(404).json({ message: 'This share link does not exist or has been disabled.' });
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return res.status(410).json({ message: 'This share link has expired.' });
    }

    const file = await File.findById(share.file);
    if (!file || file.isTrashed) {
      return res.status(404).json({ message: 'The shared file is no longer available.' });
    }

    const owner = await User.findById(share.user);

    // Increment view counter
    share.viewCount = (share.viewCount || 0) + 1;
    await share.save().catch(() => {});

    res.json({
      token: share.token,
      fileName: file.file_name,
      fileSize: file.file_size,
      fileCategory: file.file_category,
      fileMimetype: file.file_mimetype,
      fileExtension: file.file_extension,
      hasPassword: share.hasPassword,
      accessLevel: share.accessLevel,
      expiresAt: share.expiresAt,
      ownerName: owner ? owner.name : 'Uplodr User',
      createdAt: file.createdAt
    });
  } catch (error) {
    console.error('Public Share Info Error:', error);
    res.status(500).json({ message: 'Server error retrieving shared file' });
  }
};

// Public endpoint: download or preview shared file
exports.accessPublicShareFile = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const share = await Share.findOne({ token, isActive: true });
    if (!share) {
      return res.status(404).json({ message: 'Invalid or inactive share link' });
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return res.status(410).json({ message: 'Share link expired' });
    }

    // Password verification
    if (share.hasPassword) {
      if (!password) {
        return res.status(401).json({ message: 'Passphrase required to access this file', passwordRequired: true });
      }
      const isMatch = await bcrypt.compare(password, share.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect passphrase', passwordRequired: true });
      }
    }

    const file = await File.findById(share.file);
    if (!file || file.isTrashed) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Increment download count
    share.downloadCount = (share.downloadCount || 0) + 1;
    file.downloadCount = (file.downloadCount || 0) + 1;
    await share.save().catch(() => {});
    await file.save().catch(() => {});

    const localPath = storageProvider.getLocalFilePath(file.file_key);
    const safeFilename = encodeURIComponent(file.file_name);

    const isInline = req.query.inline === 'true' || share.accessLevel === 'view';
    const dispositionType = isInline ? 'inline' : 'attachment';

    res.setHeader('Content-Disposition', `${dispositionType}; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', file.file_mimetype || 'application/octet-stream');

    if (localPath && fs.existsSync(localPath)) {
      fs.createReadStream(localPath).pipe(res);
      return;
    }

    const { stream } = await storageProvider.getFileStream(file.file_key);
    stream.pipe(res);
  } catch (error) {
    console.error('Public Share Access Error:', error);
    res.status(500).json({ message: 'Error retrieving shared file' });
  }
};

