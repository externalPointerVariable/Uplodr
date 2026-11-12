const fs = require('fs');
const path = require('path');
const Media = require('../models/file.model');
let s3Client;
let BUCKET_NAME;
try {
  const s3Config = require('../utils/s3.config');
  s3Client = s3Config.s3Client;
  BUCKET_NAME = s3Config.BUCKET_NAME;
} catch (e) {
  // continue without S3 if it's local storage-based config
}
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized - invalid user session' });
    }

    const userId = req.user._id;
    const key = req.file.key || req.file.filename || '';
    const mimetype = req.file.mimetype || 'application/octet-stream';
    const rawLocation = req.file.location || req.file.path || '';
    const serverHost = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

    let location = rawLocation;
    if (!location.startsWith('http')) {
      const rel = location.replace(/\\/g, '/').replace(/^\/+/, '');
      location = `${serverHost}/${rel}`;
    }

    const size = req.file.size || 0;

    const relativePath = (req.body.relativePath || req.file.originalname || 'uploaded-file').trim();
    const filename = path.basename(relativePath);
    const fileRelativePath = relativePath;

    const fileType = mimetype.startsWith('image')
      ? 'Image'
      : mimetype.startsWith('video')
      ? 'Video'
      : 'Other';

    const folder = (req.body.folder || "Default").trim() || "Default";
    const filePath = req.file.path || '';

    const media = await Media.create({
      user: userId,
      file_key: key,
      file_mimetype: mimetype,
      file_location: location,
      file_relative_path: fileRelativePath,
      file_name: filename,
      file_size: size,
      file_type: fileType,
      folder,
    });

// 🔥 Public access via bucket policy (ACL disabled by bucket settings)
    // Note: "bucket does not allow ACLs" is expected if "Bucket owner enforced"
    console.log('✅ Upload complete - use bucket policy for public view');

    res.status(201).json({ message: 'Upload successful', media });
  } catch (error) {
    console.error('Upload Error:', error.message);
    const status = error.message.includes('Unsupported file format') ? 400 : 500;
    res.status(status).json({ message: error.message });
  }
};

exports.deleteMedia = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid record ID" });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const media = await Media.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    // 🔥 STEP 1: DELETE FROM S3 (if exists)
    if (s3Client && BUCKET_NAME && media.file_key) {
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: media.file_key,
          })
        );
        console.log('✅ Deleted from S3');
      } catch (err) {
        console.warn('⚠️ S3 delete failed:', err.message);
      }
    }

    // 🔥 STEP 2: DELETE LOCAL FILE (THIS IS THE REAL FIX)
    let filePath = "";

    if (media.file_path) {
      filePath = path.join(__dirname, "..", media.file_path);
    } else if (media.file_location) {
      const fileName = path.basename(media.file_location);
      filePath = path.join(__dirname, "..", "uploads", fileName);
    }

    console.log("🗑️ Deleting:", filePath);

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("✅ File deleted");
    } else {
      console.log("❌ File not found");
    }

    // 🔥 STEP 3: DELETE FROM DB
    await Media.findByIdAndDelete(req.params.id);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
      console.error('Delete Error:', error);
      res.status(500).json({ message: 'Delete failed' });
    }
};

exports.deleteFolder = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Now retrieving from query parameter ?folder=...
    const folderName = (req.query.folder || "").trim();

    if (!folderName || folderName === "Default") {
      return res.status(400).json({ message: 'Cannot delete the root or default folder' });
    }

    console.log(`🗑️ Robust Folder Deletion: "${folderName}" for user: ${req.user._id}`);

    // Find all files that are in this folder OR its subfolders
    // Using regex to match "folderName" or "folderName/..."
    const folderRegex = new RegExp(`^${folderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|/)`);
    
    const medias = await Media.find({
      user: req.user._id,
      folder: { $regex: folderRegex }
    });

    if (medias.length === 0) {
      return res.status(404).json({ message: 'No files found in this folder hierarchy' });
    }

    let deletedCount = 0;

    for (const media of medias) {
      // 🔥 STEP 1: DELETE FROM S3
      if (s3Client && BUCKET_NAME && media.file_key) {
        try {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: media.file_key,
            })
          );
        } catch (err) {
          console.warn(`S3 delete failed for ${media.file_key}:`, err.message);
        }
      }

      // 🔥 STEP 2: DELETE LOCAL FILE
      let filePath = "";
      if (media.file_path) {
        filePath = path.join(__dirname, "..", media.file_path);
      } else if (media.file_location) {
        const fileName = path.basename(media.file_location);
        filePath = path.join(__dirname, "..", "uploads", fileName);
      }

      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.warn(`Local file delete failed for ${filePath}:`, err.message);
        }
      }

      // 🔥 STEP 3: DELETE FROM DB
      await Media.findByIdAndDelete(media._id);
      deletedCount++;
    }

    res.json({ message: `Folder "${folderName}" and its ${deletedCount} files deleted successfully` });
  } catch (error) {
    console.error('Delete Folder Error:', error);
    res.status(500).json({ message: 'Delete folder failed' });
  }
};

exports.listMedia = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized - invalid user session' });
    }

    const userId = req.user._id;
    const folder = (req.query.folder || "").trim();

    const query = { user: userId };
    if (folder) {
      query.folder = folder;
    }

    const mediaList = await Media.find(query).sort({ createdAt: -1 });

    res.status(200).json(mediaList);
  } catch (error) {
    console.error('List Error:', error.message);
    res.status(500).json({ message: 'Server error during media listing.' });
  }
};