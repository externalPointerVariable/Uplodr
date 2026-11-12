const mongoose = require('mongoose');
const { getModel } = require('../db');

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true,
      enum: [
        'FILE_UPLOAD',
        'FILE_DELETE',
        'FILE_RESTORE',
        'FILE_DOWNLOAD',
        'FILE_RENAME',
        'FILE_STAR',
        'SHARE_CREATED',
        'SHARE_REVOKED',
        'PLAN_UPGRADED',
        'APIKEY_CREATED',
        'APIKEY_REVOKED',
        'FOLDER_CREATED',
        'FOLDER_DELETED'
      ]
    },
    targetName: {
      type: String,
      default: ''
    },
    details: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

let MongooseActivity;
try {
  MongooseActivity = mongoose.model('Activity', activitySchema);
} catch (e) {
  MongooseActivity = mongoose.models.Activity;
}

module.exports = getModel('Activity', MongooseActivity);

