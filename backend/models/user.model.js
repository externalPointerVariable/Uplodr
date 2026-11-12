const mongoose = require('mongoose');
const { getModel } = require('../db');
const { PLANS } = require('../config/plans.config');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: 'Cloud User'
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
    },
    storageUsed: {
      type: Number,
      default: 0 // In bytes
    },
    storageLimit: {
      type: Number,
      default: PLANS.free.storageLimit
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    }
  },
  {
    timestamps: true,
  }
);

let MongooseUser;
try {
  MongooseUser = mongoose.model('User', userSchema);
} catch (e) {
  MongooseUser = mongoose.models.User;
}

module.exports = getModel('User', MongooseUser);
