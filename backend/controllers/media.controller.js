const Media = require('../models/file.model');
const { s3Client, BUCKET_NAME } = require('../utils/s3.config');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { key, mimetype, location, size } = req.file;
    const userId = req.user._id;

    const filename = key.includes('__') ? key.split('__').pop() : key;

    const fileType = mimetype.startsWith('image')
      ? 'Image'
      : mimetype.startsWith('video')
      ? 'Video'
      : 'Other';

    const media = await Media.create({
      user: userId,
      file_key: key,
      file_mimetype: mimetype,
      file_location: location,
      file_name: filename,
      file_size: size,
      file_type: fileType,
    });

    res.status(201).json({
      message: 'File uploaded and metadata saved successfully.',
      media,
    });
  } catch (error) {
    console.error('Upload Error:', error.message);
    const status = error.message.includes('Unsupported file format') ? 400 : 500;
    res.status(status).json({ message: error.message });
  }
};

exports.deleteMedia = async (req, res) => {
  try {
    const mediaId = req.params.id;
    const userId = req.user._id;

    const media = await Media.findOne({ _id: mediaId, user: userId });
    if (!media) {
      return res.status(404).json({ message: 'Media not found or not owned by user.' });
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: media.file_key,
    });
    await s3Client.send(command);

    await Media.deleteOne({ _id: mediaId });

    res.json({
      message: `File '${media.file_name}' deleted successfully from S3 and MongoDB.`,
    });
  } catch (error) {
    console.error('Delete Error:', error.message);
    res.status(500).json({ message: 'Server error during media deletion.' });
  }
};

exports.listMedia = async (req, res) => {
  try {
    const userId = req.user._id;
    const mediaList = await Media.find({ user: userId }).sort({ createdAt: -1 });

    res.status(200).json(mediaList);
  } catch (error) {
    console.error('List Error:', error.message);
    res.status(500).json({ message: 'Server error during media listing.' });
  }
};