const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const { PLANS, formatBytes } = require('../config/plans.config');

// Get all plan tiers
exports.getPlans = async (req, res) => {
  res.json({
    plans: Object.values(PLANS)
  });
};

// Get current user's usage and subscription status
exports.getUsage = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentPlanId = user.plan || 'free';
    const planConfig = PLANS[currentPlanId] || PLANS.free;
    const storageUsed = user.storageUsed || 0;
    const storageLimit = user.storageLimit || planConfig.storageLimit;
    const percentage = Math.min(100, Math.round((storageUsed / storageLimit) * 100));

    res.json({
      plan: planConfig,
      billingCycle: user.billingCycle || 'monthly',
      storageUsed,
      storageUsedFormatted: formatBytes(storageUsed),
      storageLimit,
      storageLimitFormatted: formatBytes(storageLimit),
      percentageUsed: percentage,
      availableBytes: Math.max(0, storageLimit - storageUsed),
      availableFormatted: formatBytes(Math.max(0, storageLimit - storageUsed))
    });
  } catch (error) {
    console.error('Usage Error:', error);
    res.status(500).json({ message: 'Failed to retrieve storage usage' });
  }
};

// Upgrade or downgrade subscription plan
exports.changePlan = async (req, res) => {
  try {
    const { planId, billingCycle = 'monthly' } = req.body;

    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    const targetPlan = PLANS[planId];
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If downgrading, check if user's current data fits within lower limit
    if ((user.storageUsed || 0) > targetPlan.storageLimit) {
      return res.status(400).json({
        message: `Cannot switch to ${targetPlan.name}. Your current stored data (${formatBytes(user.storageUsed)}) exceeds this plan's limit (${formatBytes(targetPlan.storageLimit)}). Please delete some files first.`
      });
    }

    user.plan = planId;
    user.storageLimit = targetPlan.storageLimit;
    user.billingCycle = billingCycle;
    await user.save();

    await Activity.create({
      user: user._id,
      action: 'PLAN_UPGRADED',
      targetName: targetPlan.name,
      details: `Switched subscription to ${targetPlan.name} (${billingCycle})`
    }).catch(() => {});

    res.json({
      message: `Successfully upgraded to ${targetPlan.name}!`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        billingCycle: user.billingCycle
      },
      plan: targetPlan
    });
  } catch (error) {
    console.error('Change Plan Error:', error);
    res.status(500).json({ message: 'Failed to change subscription plan' });
  }
};

