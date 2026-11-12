const mongoose = require('mongoose');
const { getModel } = require('../db');

const fileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    file_name: {
      type: String,
      required: true,
      trim: true
    },
    file_size: {
      type: Number,
      required: true
    },
    file_mimetype: {
      type: String,
      required: true,
      trim: true
    },
    file_extension: {
      type: String,
      default: '',
      trim: true
    },
    file_category: {
      type: String,
      enum: ['image', 'video', 'audio', 'document', 'code', 'archive', 'other'],
      default: 'other',
      index: true
    },
    file_key: {
      type: String,
      required: true,
      trim: true
    },
    file_location: {
      type: String,
      required: true,
      trim: true
    },
    folder: {
      type: String,
      trim: true,
      default: '/'
    },
    isStarred: {
      type: Boolean,
      default: false,
      index: true
    },
    isTrashed: {
      type: Boolean,
      default: false,
      index: true
    },
    trashedAt: {
      type: Date,
      default: null
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

let MongooseFile;
try {
  MongooseFile = mongoose.model('File', fileSchema);
} catch (e) {
  MongooseFile = mongoose.models.File;
}

module.exports = getModel('File', MongooseFile);
