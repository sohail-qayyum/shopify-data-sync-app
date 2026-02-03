const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { buildAuthUrl, getAccessToken, generateNonce } = require('../utils/shopify');
const storeService = require('../services/storeService');
const webhookService = require('../services/webhookService');
const config = require('../config');
const { verifyHmac } = require('../middleware/auth');

// Store nonces temporarily (in production, use Redis)
const nonces = new Map();

/**
 * GET /auth - Start OAuth flow
 */
router.get('/auth', (req, res) => {
  const { shop } = req.query;
  
  if (!shop) {
    return res.status(400).send('Missing shop parameter');
  }
  
  // Validate shop domain
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
  if (!shopRegex.test(shop)) {
    return res.status(400).send('Invalid shop domain');
  }
  
  const nonce = generateNonce();
  nonces.set(shop, nonce);
  
  // Clean up old nonces after 5 minutes
  setTimeout(() => nonces.delete(shop), 5 * 60 * 1000);
  
  const redirectUri = `${config.app.url}/auth/callback`;
  const authUrl = buildAuthUrl(shop, nonce, redirectUri);
  
  res.redirect(authUrl);
});

/**
 * GET /auth/callback - OAuth callback
 */
router.get('/auth/callback', verifyHmac, async (req, res) => {
  const { shop, code, state } = req.query;
  
  // Verify nonce
  const storedNonce = nonces.get(shop);
  if (!storedNonce || storedNonce !== state) {
    return res.status(403).send('Invalid state parameter');
  }
  
  nonces.delete(shop);
  
  try {
    // Exchange code for access token
    const tokenData = await getAccessToken(shop, code);
    
    // Save store to database
    const store = await storeService.upsertStore(
      shop,
      tokenData.access_token,
      tokenData.scope
    );
    
    // Register webhooks
    await webhookService.registerWebhooks({
      id: store.id,
      shop_domain: shop,
      access_token: tokenData.access_token
    });
    
    // Create JWT for embedded app session
    const token = jwt.sign(
      { shop, storeId: store.id },
      config.security.jwtSecret,
      { expiresIn: '7d' }
    );
    
    // Redirect to app with token
    res.redirect(`/admin?shop=${shop}&token=${token}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

/**
 * GET /auth/uninstall - Handle app uninstall
 */
router.post('/auth/uninstall', async (req, res) => {
  const shop = req.get('X-Shopify-Shop-Domain');
  
  if (!shop) {
    return res.status(400).send('Missing shop domain');
  }
  
  try {
    const store = await storeService.getStoreByDomain(shop);
    
    if (store) {
      // Unregister webhooks
      await webhookService.unregisterWebhooks(store);
      
      // Deactivate store
      await storeService.deactivateStore(shop);
      
      console.log(`Store uninstalled: ${shop}`);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Uninstall error:', error);
    res.status(500).send('Uninstall failed');
  }
});

module.exports = router;
