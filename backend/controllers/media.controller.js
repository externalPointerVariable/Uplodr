const Media = require('../models/Media.model');
const { s3Client, BUCKET_NAME } = require('../utils/s3.config');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

exports.uploadMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        const { key, mimetype, location, bucket } = req.file;
        const userId = req.user._id;

        const lastUnderScore = key.lastIndexOf('__');
        const filename = key.slice(lastUnderScore + 2);
        
        const media = new Media({
            user: userId,
            file_key: key,
            file_mimetype: mimetype,
            file_location: location,
            file_name: filename,
            file_size: req.file.size,
            file_type: mimetype.startsWith('image') ? 'Image' : mimetype.startsWith('video') ? 'Video' : 'Other'
        });

        await media.save();

        res.status(201).json({
            message: 'File uploaded and metadata saved successfully.',
            media: media,
        });

    } catch (error) {
        if (error.message.includes('Unsupported file format')) {
            return res.status(400).json({ message: error.message });
        }
        console.error('Upload Error:', error.message);
        res.status(500).json({ message: 'Server error during media upload.' });
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

        const deleteParams = {
            Bucket: BUCKET_NAME,
            Key: media.file_key,
        };
        const command = new DeleteObjectCommand(deleteParams);
        await s3Client.send(command);
        await Media.deleteOne({ _id: mediaId });

        res.json({ message: `File '${media.file_name}' deleted successfully from S3 and MongoDB.` });

    } catch (error) {
        console.error('Delete Error:', error.message);
        res.status(500).json({ message: 'Server error during media deletion.' });
    }
};