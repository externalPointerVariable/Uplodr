const crypto = require('crypto');
const ApiKey = require('../models/apikey.model');
const User = require('../models/user.model');

exports.requireApiKey = async (req, res, next) => {
  try {
    const rawKey = req.headers['x-api-key'] || req.query.apiKey;

    if (!rawKey) {
      return res.status(401).json({
        error: 'Missing API Key',
        message: 'Provide your API key via the X-API-Key header or ?apiKey parameter.'
      });
    }

    const keyHash = crypto.createHash('sha256').update(String(rawKey).trim()).digest('hex');

    const apiKeyRecord = await ApiKey.findOne({ keyHash, isActive: true });
    if (!apiKeyRecord) {
      return res.status(401).json({
        error: 'Invalid API Key',
        message: 'The provided API key is invalid or has been revoked.'
      });
    }

    const user = await User.findById(apiKeyRecord.user);
    if (!user) {
      return res.status(401).json({
        error: 'Account Inactive',
        message: 'The account associated with this API key no longer exists.'
      });
    }

    // Update key metrics asynchronously
    apiKeyRecord.requestsCount = (apiKeyRecord.requestsCount || 0) + 1;
    apiKeyRecord.lastUsedAt = new Date().toISOString();
    apiKeyRecord.save().catch(() => {});

    req.user = user;
    req.apiKey = apiKeyRecord;

    next();
  } catch (err) {
    console.error('API key auth error:', err);
    res.status(500).json({ error: 'Server authentication failure' });
  }
};

