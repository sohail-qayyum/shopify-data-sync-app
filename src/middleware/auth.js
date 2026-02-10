const jwt = require('jsonwebtoken');
const config = require('../config');
const apiKeyService = require('../services/apiKeyService');
const syncLogService = require('../services/syncLogService');
const { verifyShopifyRequest } = require('../utils/shopify');

/**
 * Verify Shopify session for embedded app routes
 */
async function verifyShopifySession(req, res, next) {
  const { shop } = req.query;

  if (!shop) {
    return res.status(400).json({ error: 'Missing shop parameter' });
  }

  // In production, you would verify the session token from the embedded app
  // For now, we'll use a simple JWT approach
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, config.security.jwtSecret);
    req.shop = decoded.shop;
    req.storeId = decoded.storeId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Verify API key for external portal requests
 */
async function verifyApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const apiSecret = req.headers['x-api-secret'];

  if (!apiKey || !apiSecret) {
    return res.status(401).json({
      error: 'Missing API credentials',
      message: 'Please provide X-API-Key and X-API-Secret headers'
    });
  }

  try {
    const keyData = await apiKeyService.getApiKeyByKey(apiKey);

    if (!keyData) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Update last used timestamp
    await apiKeyService.updateLastUsed(keyData.id);

    // Attach to request
    req.apiKeyId = keyData.id;
    req.storeId = keyData.store_id;
    req.shopDomain = keyData.shop_domain;
    req.accessToken = keyData.access_token;
    req.scopes = keyData.scopes.split(',');

    next();
  } catch (error) {
    console.error('API key verification error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Verify Shopify HMAC for OAuth and other requests
 */
function verifyHmac(req, res, next) {
  if (!verifyShopifyRequest(req.query)) {
    return res.status(403).json({ error: 'Invalid HMAC signature' });
  }
  next();
}

/**
 * Rate limiting for API requests
 */
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each API key to 100 requests per windowMs
  message: 'Too many requests from this API key, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip
});

/**
 * Helper function to log sync operations (shared)
 */
async function logOperation(req, action, resourceType, resourceId, status, details = null) {
  try {
    await syncLogService.logSync(
      req.storeId,
      req.apiKeyId,
      action,
      resourceType,
      resourceId,
      status,
      details
    );
  } catch (error) {
    console.error('Error logging sync operation:', error);
  }
}

module.exports = {
  verifyShopifySession,
  verifyApiKey,
  authenticateApiKey: verifyApiKey, // Alias for graphql routes
  verifyHmac,
  apiLimiter,
  logOperation
};
