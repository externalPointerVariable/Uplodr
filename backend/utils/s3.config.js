const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'ap-south-1',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'easysharebucket';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: BUCKET_NAME,
    acl: 'public-read',
    metadata: (req, file, cb) => {
      cb(null, {
        userId: String(req.user._id),
        originalName: file.originalname,
      });
    },
    key: (req, file, cb) => {
      const timestamp = Date.now();
      const userId = req.user._id;
      const filename = file.originalname;
      cb(null, `media/${userId}/${timestamp}__${filename}`);
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(jpeg|jpg|png|webp|gif|mp4|mov|avi|webm)$/i;
    if (!allowedTypes.test(file.originalname)) {
      return cb(new Error('Unsupported file format. Please upload an image or video.'));
    }
    cb(null, true);
  },
});

exports.s3UploadMiddleware = upload.single('media');
exports.s3Client = s3Client;
exports.BUCKET_NAME = BUCKET_NAME;