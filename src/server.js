const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const config = require('./config');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const webhookRoutes = require('./routes/webhooks');

const app = express();

// Trust proxy
app.set('trust proxy', true);

// Disable helmet for admin and auth routes to allow iframe embedding
app.use((req, res, next) => {
  if (req.path.startsWith('/admin') || req.path.startsWith('/auth') || req.path.startsWith('/api/admin')) {
    return next();
  }
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })(req, res, next);
});

// Allow embedding in Shopify
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors https://*.myshopify.com https://admin.shopify.com");
  next();
});

// CORS - Allow all for now (you can restrict later)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-API-Secret']
}));

// Cookie parser
app.use(cookieParser());

// Body parser - with raw body capture for webhooks
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({ extended: true }));

// Logging middleware (helpful for debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    app: 'Shopify Data Sync App',
    version: '1.0.0',
    description: 'Multi-tenant Shopify app for real-time data synchronization',
    endpoints: {
      auth: '/auth',
      admin: '/admin',
      api: '/api',
      webhooks: '/webhooks'
    }
  });
});

// Mount routes
app.use('/', authRoutes);           // OAuth and installation
app.use('/', adminRoutes);          // Admin UI and management
app.use('/api', apiRoutes);         // External API for portal
app.use('/webhooks', webhookRoutes); // Shopify webhooks

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(config.app.env === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
const PORT = config.app.port;
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                                                        ║');
  console.log('║       🔄 Shopify Data Sync App - RUNNING 🚀          ║');
  console.log('║                                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 Server URL:        ${config.app.url}`);
  console.log(`🔌 Port:              ${PORT}`);
  console.log(`🏪 Environment:       ${config.app.env}`);
  console.log('');
  console.log('📍 Endpoints:');
  console.log(`   - OAuth:           ${config.app.url}/auth`);
  console.log(`   - Admin Panel:     ${config.app.url}/admin`);
  console.log(`   - API:             ${config.app.url}/api`);
  console.log(`   - Webhooks:        ${config.app.url}/webhooks`);
  console.log('');
  console.log('✅ Ready to accept connections!');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
