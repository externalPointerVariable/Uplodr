const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Check S3 availability
const hasS3Config = Boolean(
  process.env.S3_BUCKET_NAME &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  (process.env.STORAGE_MODE === 's3' || !process.env.STORAGE_MODE)
);

let s3Client = null;
const BUCKET_NAME = process.env.S3_BUCKET_NAME || '';

if (hasS3Config) {
  try {
    s3Client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    console.log(`✅ S3 Storage Provider initialized for bucket: ${BUCKET_NAME}`);
  } catch (err) {
    console.warn('⚠️ S3 init failed, falling back to Local Storage Provider:', err.message);
    s3Client = null;
  }
} else {
  console.log('ℹ️ Running in Local Storage Provider mode (files stored in backend/uploads/)');
}

// Detect file category from mimetype and extension
function getFileCategory(mimetype = '', filename = '') {
  const mime = mimetype.toLowerCase();
  const ext = path.extname(filename).toLowerCase().replace('.', '');

  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp', 'avif'].includes(ext)) {
    return 'image';
  }
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', 'flv'].includes(ext)) {
    return 'video';
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext)) {
    return 'audio';
  }
  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('excel') ||
    mime.includes('presentation') ||
    mime.includes('officedocument') ||
    mime.includes('text/plain') ||
    mime.includes('csv') ||
    ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'tsv'].includes(ext)
  ) {
    return 'document';
  }
  if (
    mime.includes('javascript') ||
    mime.includes('json') ||
    mime.includes('html') ||
    mime.includes('xml') ||
    [
      'js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'scss', 'py', 'java', 'c', 'cpp',
      'cs', 'go', 'rs', 'php', 'rb', 'sql', 'sh', 'yaml', 'yml', 'xml', 'md'
    ].includes(ext)
  ) {
    return 'code';
  }
  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('compressed') ||
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)
  ) {
    return 'archive';
  }

  return 'other';
}

// Save uploaded file buffer or stream to active storage backend
async function saveFile({ buffer, originalname, mimetype, userId }) {
  const ext = path.extname(originalname);
  const base = path.basename(originalname, ext).replace(/[^a-zA-Z0-9_\-]/g, '_');
  const safeFilename = `${Date.now()}_${base}${ext}`;
  const fileKey = `${userId}/${safeFilename}`;
  const category = getFileCategory(mimetype, originalname);

  if (s3Client && BUCKET_NAME) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
          Body: buffer,
          ContentType: mimetype || 'application/octet-stream',
        })
      );

      const location = `https://${BUCKET_NAME}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${fileKey}`;
      return {
        key: fileKey,
        location,
        category,
        storageType: 's3'
      };
    } catch (err) {
      console.warn('⚠️ S3 upload failed, storing locally instead:', err.message);
    }
  }

  // Local storage write
  const userDir = path.join(UPLOADS_DIR, String(userId));
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const localFilePath = path.join(userDir, safeFilename);
  fs.writeFileSync(localFilePath, buffer);

  const serverUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const location = `${serverUrl}/uploads/${userId}/${safeFilename}`;

  return {
    key: fileKey,
    location,
    category,
    storageType: 'local'
  };
}

// Delete file from active storage
async function deleteStoredFile(fileKey) {
  if (!fileKey) return;

  if (s3Client && BUCKET_NAME) {
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
        })
      );
    } catch (err) {
      console.warn('⚠️ S3 delete failed:', err.message);
    }
  }

  // Delete local file if it exists
  const localPath = path.join(UPLOADS_DIR, fileKey);
  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch (err) {
      console.warn('⚠️ Local file delete error:', err.message);
    }
  }
}

// Read stream for download or media preview
async function getFileStream(fileKey) {
  const localPath = path.join(UPLOADS_DIR, fileKey);
  if (fs.existsSync(localPath)) {
    return {
      stream: fs.createReadStream(localPath),
      size: fs.statSync(localPath).size
    };
  }

  if (s3Client && BUCKET_NAME) {
    const s3Res = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey
      })
    );
    return {
      stream: s3Res.Body,
      size: s3Res.ContentLength
    };
  }

  throw new Error('File not found in storage');
}

// Check if file exists locally
function getLocalFilePath(fileKey) {
  const localPath = path.join(UPLOADS_DIR, fileKey);
  return fs.existsSync(localPath) ? localPath : null;
}

module.exports = {
  saveFile,
  deleteStoredFile,
  getFileStream,
  getLocalFilePath,
  getFileCategory,
  isS3Active: () => Boolean(s3Client && BUCKET_NAME)
};

