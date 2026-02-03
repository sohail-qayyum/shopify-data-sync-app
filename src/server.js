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

// Trust proxy (needed when behind Nginx with HTTPS)
app.set('trust proxy', true);

// IMPORTANT: Disable helmet for Shopify embedded app routes
// Helmet's default settings block iframe embedding
app.use((req, res, next) => {
  // Allow embedding in Shopify Admin iframe
  if (req.path.startsWith('/admin') || req.path.startsWith('/auth')) {
    // Don't use helmet for these routes
    return next();
  }
  
  // Use helmet for other routes
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })(req, res, next);
});

// Set proper headers for Shopify embedding
app.use((req, res, next) => {
  // Remove X-Frame-Options to allow embedding
  res.removeHeader('X-Frame-Options');
  
  // Allow embedding from Shopify admin
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors https://*.myshopify.com https://admin.shopify.com"
  );
  
  next();
});

// CORS configuration - allow Shopify domains
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from Shopify domains and your app domain
    const allowedOrigins = [
      config.app.url,
      /https:\/\/.*\.myshopify\.com$/,
      /https:\/\/admin\.shopify\.com$/
    ];
    
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    callback(null, isAllowed);
  },
  credentials: true
}));

// Cookie parser
app.use(cookieParser());

// Body parser - regular routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
