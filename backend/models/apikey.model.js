const mongoose = require('mongoose');
const { getModel } = require('../db');

const apiKeySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Default API Key'
    },
    keyPrefix: {
      type: String,
      required: true
    },
    keyHash: {
      type: String,
      required: true
    },
    scopes: {
      type: [String],
      default: ['files:read', 'files:write', 'files:delete']
    },
    requestsCount: {
      type: Number,
      default: 0
    },
    lastUsedAt: {
      type: Date,
      default: null
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

let MongooseApiKey;
try {
  MongooseApiKey = mongoose.model('ApiKey', apiKeySchema);
} catch (e) {
  MongooseApiKey = mongoose.models.ApiKey;
}

module.exports = getModel('ApiKey', MongooseApiKey);

