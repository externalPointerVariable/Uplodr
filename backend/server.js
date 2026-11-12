const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve locally stored user uploads as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logger
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes    = require('./routes/user.route');
const fileRoutes    = require('./routes/file.route');
const folderRoutes  = require('./routes/folder.route');
const shareRoutes   = require('./routes/share.route');
const planRoutes    = require('./routes/plan.route');
const apikeyRoutes  = require('./routes/apikey.route');
const analyticsRoutes = require('./routes/analytics.route');

app.use('/api/auth',      authRoutes);
app.use('/api/files',     fileRoutes);
app.use('/api/folders',   folderRoutes);
app.use('/api/shares',    shareRoutes);
app.use('/api/plans',     planRoutes);
app.use('/api/apikeys',   apikeyRoutes);
app.use('/api/analytics', analyticsRoutes);

// ─── Health & Root ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Uplodr Storage SaaS is running ✅' });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Uplodr Storage SaaS',
    version: '2.0.0',
    docs: '/api/plans'
  });
});

// ─── API 404 fallback ─────────────────────────────────────────────────────────
app.use('/api', (req, res) => {
  if (!res.headersSent) {
    res.status(404).json({ message: `Endpoint not found: ${req.originalUrl}` });
  }
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
(async () => {
  await initDB();
  app.listen(PORT, () => {
    console.log(`🚀 Uplodr Storage SaaS running on http://localhost:${PORT}`);
  });
})();
