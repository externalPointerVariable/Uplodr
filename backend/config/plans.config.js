// SaaS Subscription Tiers and Quota Definitions

const PLANS = {
  free: {
    id: 'free',
    name: 'Starter Cloud',
    price: 0,
    priceLabel: 'Free Forever',
    storageLimit: 1 * 1024 * 1024 * 1024, // 1 GB in bytes
    maxFileSize: 25 * 1024 * 1024, // 25 MB max per file
    maxApiKeys: 1,
    maxShareLinks: 5,
    features: [
      '1 GB High-Speed Cloud Storage',
      '25 MB Max File Size',
      'All File Formats Supported',
      'Standard Public Share Links',
      'Inline Document & Media Previews',
      'Community Support'
    ],
    badgeColor: 'gray'
  },
  pro: {
    id: 'pro',
    name: 'Pro Creator',
    price: 12,
    yearlyPrice: 120,
    priceLabel: '$12 / month',
    storageLimit: 100 * 1024 * 1024 * 1024, // 100 GB in bytes
    maxFileSize: 2 * 1024 * 1024 * 1024, // 2 GB max per file
    maxApiKeys: 5,
    maxShareLinks: 100,
    features: [
      '100 GB High-Speed Cloud Storage',
      '2 GB Max File Size',
      'Password Protected Share Links',
      'Custom Link Expiration Dates',
      'Batch ZIP Downloads',
      'Developer API Access (5 Keys)',
      '30-Day Trash Recovery Period',
      'Priority CDN & Email Support'
    ],
    badgeColor: 'indigo',
    popular: true
  },
  enterprise: {
    id: 'enterprise',
    name: 'Team & Enterprise',
    price: 49,
    yearlyPrice: 480,
    priceLabel: '$49 / month',
    storageLimit: 1024 * 1024 * 1024 * 1024, // 1 TB in bytes
    maxFileSize: 10 * 1024 * 1024 * 1024, // 10 GB max per file
    maxApiKeys: 25,
    maxShareLinks: 1000,
    features: [
      '1 TB Dedicated Storage Vault',
      '10 GB Max File Size',
      'Advanced Security & Audit Trail',
      'Unlimited Share Links & Passwords',
      '25 Developer API Keys',
      'Team Multi-user Collaboration',
      'Custom S3 / S3-Compatible Endpoint Sync',
      '24/7 Dedicated Support & SLA'
    ],
    badgeColor: 'emerald'
  }
};

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = {
  PLANS,
  formatBytes
};

