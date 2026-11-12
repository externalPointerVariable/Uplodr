const Activity = require('../models/activity.model');
const File = require('../models/file.model');
const User = require('../models/user.model');
const { formatBytes, PLANS } = require('../config/plans.config');

// Get user activity feed
exports.getActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const activities = await Activity.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(activities);
  } catch (error) {
    console.error('Activities Error:', error);
    res.status(500).json({ message: 'Failed to retrieve activity feed' });
  }
};

// Get storage analytics and category distribution
exports.getStorageBreakdown = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const files = await File.find({ user: userId, isTrashed: false });

    const categories = {
      document: { name: 'Documents', count: 0, bytes: 0, color: '#3b82f6' },
      image: { name: 'Images', count: 0, bytes: 0, color: '#10b981' },
      video: { name: 'Videos', count: 0, bytes: 0, color: '#8b5cf6' },
      audio: { name: 'Audio', count: 0, bytes: 0, color: '#f59e0b' },
      code: { name: 'Code & Data', count: 0, bytes: 0, color: '#06b6d4' },
      archive: { name: 'Archives', count: 0, bytes: 0, color: '#ec4899' },
      other: { name: 'Other Files', count: 0, bytes: 0, color: '#6b7280' }
    };

    let totalCalculatedBytes = 0;
    let totalDownloads = 0;
    let starredCount = 0;

    for (const f of files) {
      const cat = f.file_category || 'other';
      if (!categories[cat]) categories[cat] = { name: cat, count: 0, bytes: 0, color: '#6b7280' };
      categories[cat].count += 1;
      categories[cat].bytes += f.file_size || 0;
      totalCalculatedBytes += f.file_size || 0;
      totalDownloads += f.downloadCount || 0;
      if (f.isStarred) starredCount += 1;
    }

    const trashedFiles = await File.find({ user: userId, isTrashed: true });
    let trashedBytes = 0;
    for (const tf of trashedFiles) {
      trashedBytes += tf.file_size || 0;
    }

    const planConfig = PLANS[user.plan || 'free'] || PLANS.free;
    const storageLimit = user.storageLimit || planConfig.storageLimit;
    const storageUsed = user.storageUsed || totalCalculatedBytes;

    const breakdown = Object.entries(categories).map(([key, data]) => ({
      key,
      name: data.name,
      count: data.count,
      bytes: data.bytes,
      formattedBytes: formatBytes(data.bytes),
      percentage: storageUsed > 0 ? Math.round((data.bytes / storageUsed) * 100) : 0,
      color: data.color
    }));

    res.json({
      totalFiles: files.length,
      totalDownloads,
      starredCount,
      trashedCount: trashedFiles.length,
      trashedBytes,
      trashedBytesFormatted: formatBytes(trashedBytes),
      storageUsed,
      storageUsedFormatted: formatBytes(storageUsed),
      storageLimit,
      storageLimitFormatted: formatBytes(storageLimit),
      percentageUsed: Math.min(100, Math.round((storageUsed / storageLimit) * 100)),
      categories: breakdown
    });
  } catch (error) {
    console.error('Storage Breakdown Error:', error);
    res.status(500).json({ message: 'Failed to generate storage analytics' });
  }
};

