const multer = require("multer");
const multerS3 = require("multer-s3");
const AWS = require("aws-sdk");

const s3Client = new AWS.S3({
  region: process.env.S3_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
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