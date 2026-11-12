const mongoose = require('mongoose');
const { createModel } = require('./embedded');

let isMongooseActive = false;

async function initDB() {
  const mongoUri = process.env.MONGO_URI;

  if (mongoUri && mongoUri.trim() !== '') {
    try {
      console.log('🔄 Connecting to MongoDB Atlas / cluster...');
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 4000
      });
      isMongooseActive = true;
      console.log('✅ MongoDB connected successfully');
      return;
    } catch (err) {
      console.warn(`⚠️ MongoDB connection failed (${err.message}). Falling back to Embedded Zero-Config Storage Engine.`);
    }
  } else {
    console.log('ℹ️ No MONGO_URI specified. Operating in Embedded Zero-Config Storage Engine (persisted to backend/data/saas_db.json)');
  }

  isMongooseActive = false;
}

function getModel(name, mongooseModel) {
  return new Proxy({}, {
    get(target, prop) {
      if (isMongooseActive && mongooseModel) {
        return mongooseModel[prop];
      }
      const embeddedModel = createModel(name.toLowerCase() + 's');
      return embeddedModel[prop];
    }
  });
}

module.exports = {
  initDB,
  getModel,
  isMongooseConnected: () => isMongooseActive
};

