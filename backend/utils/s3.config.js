const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3'); 
const s3Client = new S3Client({
    region: process.env.S3_REGION || 'ap-south-1'});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'easysharebucket';
const MAX_FILE_SIZE = 5 * 1024 * 1024; 

const upload = multer({
    storage: multerS3({
        s3: s3Client,
        acl: 'public-read',
        bucket: BUCKET_NAME,
        metadata: function (req, file, cb) {
            cb(null, { userId: String(req.user._id), originalName: file.originalname });
        },
        key: function (req, file, cb) {
            cb(null, `media/${req.user._id}/${Date.now()}__${file.originalname}`);
        },
    }),
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
    fileFilter(req, file, cb) {
        if (
            !file.originalname.match(
                /\.(jpeg|jpg|png|webp|gif|mp4|mov|avi|webm)$/i
            )
        ) {
            return cb(
                new Error(
                    'Unsupported file format. Please upload an image or video.'
                )
            );
        }
        cb(null, true);
    },
});

exports.s3UploadMiddleware = upload.single('media'); 
exports.s3Client = s3Client;
exports.BUCKET_NAME = BUCKET_NAME;