const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

const s3UploadMiddleware = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: BUCKET_NAME,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const userId = req.user?._id?.toString() || "anonymous";
      const timestamp = Date.now();
      const filename = `${userId}/${timestamp}__${file.originalname}`;
      cb(null, filename);
    },
  }),
}).single("media");

module.exports = {
  s3Client,
  BUCKET_NAME,
  s3UploadMiddleware,
};