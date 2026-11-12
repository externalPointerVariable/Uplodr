const crypto = require('crypto');
const ApiKey = require('../models/apikey.model');
const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const { PLANS } = require('../config/plans.config');

// Generate a new developer API key
exports.createApiKey = async (req, res) => {
  try {
    const { name = 'Production API Key', scopes = ['files:read', 'files:write', 'files:delete'] } = req.body;

    const user = await User.findById(req.user._id);
    const planConfig = PLANS[user.plan || 'free'] || PLANS.free;

    // Check plan API key limits
    const existingCount = await ApiKey.countDocuments({ user: req.user._id, isActive: true });
    if (existingCount >= planConfig.maxApiKeys) {
      return res.status(403).json({
        message: `API Key limit reached for your ${planConfig.name} plan (max ${planConfig.maxApiKeys} keys). Upgrade your plan to create more keys.`
      });
    }

    // Generate secret key
    const rawSecret = 'upl_live_' + crypto.randomBytes(24).toString('hex');
    const keyPrefix = rawSecret.slice(0, 14) + '...' + rawSecret.slice(-4);
    const keyHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

    const apiKey = await ApiKey.create({
      user: req.user._id,
      name: name.trim() || 'API Key',
      keyPrefix,
      keyHash,
      scopes,
      requestsCount: 0,
      isActive: true
    });

    await Activity.create({
      user: req.user._id,
      action: 'APIKEY_CREATED',
      targetName: apiKey.name,
      details: `Generated API Key (${keyPrefix})`
    }).catch(() => {});

    res.status(201).json({
      message: 'API Key generated successfully. Please copy it now as it will not be shown again.',
      apiKey: {
        _id: apiKey._id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        rawKey: rawSecret, // Only returned once on creation!
        scopes: apiKey.scopes,
        createdAt: apiKey.createdAt
      }
    });
  } catch (error) {
    console.error('Create API Key Error:', error);
    res.status(500).json({ message: 'Failed to create API key' });
  }
};

// List user API keys
exports.listApiKeys = async (req, res) => {
  try {
    const keys = await ApiKey.find({ user: req.user._id, isActive: true });
    res.json(keys.map(k => ({
      _id: k._id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes,
      requestsCount: k.requestsCount || 0,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt
    })));
  } catch (error) {
    console.error('List API Keys Error:', error);
    res.status(500).json({ message: 'Failed to retrieve API keys' });
  }
};

// Revoke API key
exports.revokeApiKey = async (req, res) => {
  try {
    const key = await ApiKey.findOne({ _id: req.params.id, user: req.user._id });
    if (!key) {
      return res.status(404).json({ message: 'API key not found' });
    }

    key.isActive = false;
    await key.save();

    await Activity.create({
      user: req.user._id,
      action: 'APIKEY_REVOKED',
      targetName: key.name,
      details: `Revoked API Key (${key.keyPrefix})`
    }).catch(() => {});

    res.json({ message: 'API key revoked' });
  } catch (error) {
    console.error('Revoke API Key Error:', error);
    res.status(500).json({ message: 'Failed to revoke API key' });
  }
};

