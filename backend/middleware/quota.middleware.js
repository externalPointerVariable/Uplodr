const User = require('../models/user.model');
const { PLANS, formatBytes } = require('../config/plans.config');

exports.checkStorageQuota = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    const planId = user.plan || 'free';
    const planConfig = PLANS[planId] || PLANS.free;

    req.currentUser = user;
    req.planConfig = planConfig;

    // Collect all incoming files (supports both multer.array and multer.single)
    const incomingFiles = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);

    if (incomingFiles.length > 0) {
      let totalIncoming = 0;

      for (const file of incomingFiles) {
        const fileSize = file.size || 0;

        // Per-file max size check
        if (fileSize > planConfig.maxFileSize) {
          return res.status(413).json({
            message: `"${file.originalname}" exceeds the maximum file size for the ${planConfig.name} plan (${formatBytes(planConfig.maxFileSize)}). Please upgrade your plan.`,
            maxAllowed: planConfig.maxFileSize,
            plan: planConfig.name
          });
        }

        totalIncoming += fileSize;
      }

      // Total quota check
      const currentUsed = user.storageUsed || 0;
      const limit = user.storageLimit || planConfig.storageLimit;

      if (currentUsed + totalIncoming > limit) {
        return res.status(403).json({
          message: `Storage quota exceeded. Used ${formatBytes(currentUsed)} of ${formatBytes(limit)}. Upgrade your plan or free up space.`,
          currentUsed,
          storageLimit: limit,
          plan: planConfig.name,
          upgradeRequired: true
        });
      }
    }

    next();
  } catch (err) {
    console.error('Quota check error:', err);
    res.status(500).json({ message: 'Failed to verify storage quota' });
  }
};
