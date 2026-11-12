const User = require('../models/user.model');
const Activity = require('../models/activity.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PLANS } = require('../config/plans.config');

const JWT_SECRET = process.env.JWT_SECRET || 'uplodr_dev_secret';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      plan: 'free',
      storageUsed: 0,
      storageLimit: PLANS.free.storageLimit,
      billingCycle: 'monthly',
      role: 'user'
    });

    await Activity.create({
      user: user._id,
      action: 'PLAN_UPGRADED',
      targetName: 'Starter Cloud (Free)',
      details: 'Welcome to Uplodr Storage SaaS!'
    }).catch(() => {});

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      storageUsed: user.storageUsed,
      storageLimit: user.storageLimit,
      token: generateToken(user),
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    const isMatch = user && (await bcrypt.compare(password, user.password));

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      plan: user.plan || 'free',
      storageUsed: user.storageUsed || 0,
      storageLimit: user.storageLimit || PLANS.free.storageLimit,
      token: generateToken(user),
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error during login' });
  }
};

exports.getMe = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      plan: user.plan || 'free',
      storageUsed: user.storageUsed || 0,
      storageLimit: user.storageLimit || PLANS.free.storageLimit,
      billingCycle: user.billingCycle || 'monthly',
      role: user.role || 'user'
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve profile' });
  }
};
