const mongoose = require('mongoose');
const { getModel } = require('../db');

const shareSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      required: true,
      index: true
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    accessLevel: {
      type: String,
      enum: ['view', 'download'],
      default: 'download'
    },
    hasPassword: {
      type: Boolean,
      default: false
    },
    passwordHash: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    viewCount: {
      type: Number,
      default: 0
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

let MongooseShare;
try {
  MongooseShare = mongoose.model('Share', shareSchema);
} catch (e) {
  MongooseShare = mongoose.models.Share;
}

module.exports = getModel('Share', MongooseShare);

