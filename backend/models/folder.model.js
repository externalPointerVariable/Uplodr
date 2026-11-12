const mongoose = require('mongoose');
const { getModel } = require('../db');

const folderSchema = new mongoose.Schema(
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
      trim: true
    },
    path: {
      type: String,
      required: true,
      trim: true
    },
    parentPath: {
      type: String,
      default: '/',
      trim: true
    },
    color: {
      type: String,
      default: 'indigo'
    }
  },
  {
    timestamps: true
  }
);

let MongooseFolder;
try {
  MongooseFolder = mongoose.model('Folder', folderSchema);
} catch (e) {
  MongooseFolder = mongoose.models.Folder;
}

module.exports = getModel('Folder', MongooseFolder);

