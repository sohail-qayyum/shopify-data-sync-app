const express = require('express');
const router = express.Router();
const { verifyApiKey, apiLimiter } = require('../middleware/auth');
const { ShopifyAPI } = require('../utils/shopify');
const syncLogService = require('../services/syncLogService');

// Apply rate limiting to all API routes
router.use(apiLimiter);

// Apply API key authentication to all routes
router.use(verifyApiKey);

/**
 * Helper function to check scope
 */
function requireScope(scope) {
  return (req, res, next) => {
    if (!req.scopes || !req.scopes.includes(scope)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This API key does not have the '${scope}' scope`,
        yourScopes: req.scopes,
        requiredScope: scope
      });
    }
    next();
  };
}

/**
 * Helper function to log sync operations
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
    console.error('Error logging sync:', error);
  }
}

// ===== ORDERS =====

/**
 * GET /api/orders - Get all orders
 */
router.get('/orders', requireScope('read_orders'), async (req, res) => {
  try {
    console.log('=== GET /api/orders ===');
    console.log('Shop:', req.shopDomain);
    console.log('Query:', req.query);
    
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.getOrders(req.query);
    
    console.log('✅ Fetched', result.orders?.length || 0, 'orders');
    
    await logOperation(req, 'READ', 'order', null, 'success', { count: result.orders?.length || 0 });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Orders fetch failed:', error.message);
    console.error('Shopify error:', error.response?.data);
    
    await logOperation(req, 'READ', 'order', null, 'error', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to fetch orders', 
      message: error.message,
      details: error.response?.data
    });
  }
});

/**
 * GET /api/orders/:id - Get specific order
 */
router.get('/orders/:id', requireScope('read_orders'), async (req, res) => {
  try {
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.getOrder(req.params.id);
    
    await logOperation(req, 'READ', 'order', req.params.id, 'success');
    
    res.json(result);
  } catch (error) {
    console.error('❌ Order fetch failed:', error.message);
    await logOperation(req, 'READ', 'order', req.params.id, 'error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch order', message: error.message });
  }
});

/**
 * PUT /api/orders/:id - Update order
 */
router.put('/orders/:id', requireScope('write_orders'), async (req, res) => {
  try {
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.updateOrder(req.params.id, req.body);
    
    await logOperation(req, 'UPDATE', 'order', req.params.id, 'success', { updates: req.body });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Order update failed:', error.message);
    await logOperation(req, 'UPDATE', 'order', req.params.id, 'error', { error: error.message });
    res.status(500).json({ error: 'Failed to update order', message: error.message });
  }
});

// ===== CUSTOMERS =====

/**
 * GET /api/customers - Get all customers
 */
router.get('/customers', requireScope('read_customers'), async (req, res) => {
  try {
    console.log('=== GET /api/customers ===');
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.getCustomers(req.query);
    
    console.log('✅ Fetched', result.customers?.length || 0, 'customers');
    
    await logOperation(req, 'READ', 'customer', null, 'success', { count: result.customers?.length || 0 });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Customers fetch failed:', error.message);
    await logOperation(req, 'READ', 'customer', null, 'error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch customers', message: error.message });
  }
});

/**
 * GET /api/customers/:id - Get specific customer
 */
router.get('/customers/:id', requireScope('read_customers'), async (req, res) => {
  try {
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.getCustomer(req.params.id);
    
    await logOperation(req, 'READ', 'customer', req.params.id, 'success');
    
    res.json(result);
  } catch (error) {
    console.error('❌ Customer fetch failed:', error.message);
    await logOperation(req, 'READ', 'customer', req.params.id, 'error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch customer', message: error.message });
  }
});

/**
 * PUT /api/customers/:id - Update customer
 */
router.put('/customers/:id', requireScope('write_customers'), async (req, res) => {
  try {
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.updateCustomer(req.params.id, req.body);
    
    await logOperation(req, 'UPDATE', 'customer', req.params.id, 'success', { updates: req.body });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Customer update failed:', error.message);
    await logOperation(req, 'UPDATE', 'customer', req.params.id, 'error', { error: error.message });
    res.status(500).json({ error: 'Failed to update customer', message: error.message });
  }
});

// ===== PRODUCTS =====

/**
 * GET /api/products - Get all products
 */
router.get('/products', requireScope('read_products'), async (req, res) => {
  try {
    console.log('=== GET /api/products ===');
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.getProducts(req.query);
    
    console.log('✅ Fetched', result.products?.length || 0, 'products');
    
    await logOperation(req, 'READ', 'product', null, 'success', { count: result.products?.length || 0 });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Products fetch failed:', error.message);
    await logOperation(req, 'READ', 'product', null, 'error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch products', message: error.message });
  }
});

/**
 * GET /api/products/:id - Get specific product
 */
router.get('/products/:id', requireScope('read_products'), async (req, res) => {
  try {
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.getProduct(req.params.id);
    
    await logOperation(req, 'READ', 'product', req.params.id, 'success');
    
    res.json(result);
  } catch (error) {
    console.error('❌ Product fetch failed:', error.message);
    await logOperation(req, 'READ', 'product', req.params.id, 'error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch product', message: error.message });
  }
});

/**
 * PUT /api/products/:id - Update product
 */
router.put('/products/:id', requireScope('write_products'), async (req, res) => {
  try {
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.updateProduct(req.params.id, req.body);
    
    await logOperation(req, 'UPDATE', 'product', req.params.id, 'success', { updates: req.body });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Product update failed:', error.message);
    await logOperation(req, 'UPDATE', 'product', req.params.id, 'error', { error: error.message });
    res.status(500).json({ error: 'Failed to update product', message: error.message });
  }
});

/**
 * POST /api/products - Create product
 */
router.post('/products', requireScope('write_products'), async (req, res) => {
  try {
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.createProduct(req.body);
    
    await logOperation(req, 'CREATE', 'product', result.product?.id, 'success', { product: req.body });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Product create failed:', error.message);
    await logOperation(req, 'CREATE', 'product', null, 'error', { error: error.message });
    res.status(500).json({ error: 'Failed to create product', message: error.message });
  }
});

// ===== INVENTORY =====

/**
 * GET /api/inventory - Get inventory levels
 */
router.get('/inventory', requireScope('read_inventory'), async (req, res) => {
  try {
    console.log('=== GET /api/inventory ===');
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.getInventoryLevels(req.query);
    
    console.log('✅ Fetched inventory levels');
    
    await logOperation(req, 'READ', 'inventory', null, 'success', { count: result.inventory_levels?.length || 0 });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Inventory fetch failed:', error.message);
    await logOperation(req, 'READ', 'inventory', null, 'error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch inventory', message: error.message });
  }
});

/**
 * POST /api/inventory/sync - Sync inventory to Shopify
 */
router.post('/inventory/sync', requireScope('write_inventory'), async (req, res) => {
  try {
    const { inventory_item_id, location_id, available } = req.body;
    
    if (!inventory_item_id || !location_id || available === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: inventory_item_id, location_id, available' 
      });
    }
    
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.updateInventoryLevel(inventory_item_id, location_id, available);
    
    console.log('✅ Inventory synced:', inventory_item_id);
    
    await logOperation(req, 'UPDATE', 'inventory', inventory_item_id, 'success', { 
      location_id, 
      available 
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Inventory sync failed:', error.message);
    await logOperation(req, 'UPDATE', 'inventory', req.body.inventory_item_id, 'error', { 
      error: error.message 
    });
    res.status(500).json({ error: 'Failed to sync inventory', message: error.message });
  }
});

// ===== LOCATIONS =====

/**
 * GET /api/locations - Get all locations
 */
router.get('/locations', requireScope('read_locations'), async (req, res) => {
  try {
    console.log('=== GET /api/locations ===');
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.getLocations();
    
    console.log('✅ Fetched', result.locations?.length || 0, 'locations');
    
    await logOperation(req, 'READ', 'location', null, 'success', { count: result.locations?.length || 0 });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Locations fetch failed:', error.message);
    await logOperation(req, 'READ', 'location', null, 'error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch locations', message: error.message });
  }
});

// ===== FULFILLMENTS =====

/**
 * GET /api/orders/:orderId/fulfillments - Get fulfillments for an order
 */
router.get('/orders/:orderId/fulfillments', requireScope('read_fulfillments'), async (req, res) => {
  try {
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.getFulfillments(req.params.orderId);
    
    await logOperation(req, 'READ', 'fulfillment', null, 'success', { order_id: req.params.orderId });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Fulfillments fetch failed:', error.message);
    await logOperation(req, 'READ', 'fulfillment', null, 'error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch fulfillments', message: error.message });
  }
});

/**
 * POST /api/orders/:orderId/fulfillments - Create fulfillment
 */
router.post('/orders/:orderId/fulfillments', requireScope('write_fulfillments'), async (req, res) => {
  try {
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.createFulfillment(req.params.orderId, req.body);
    
    console.log('✅ Fulfillment created for order:', req.params.orderId);
    
    await logOperation(req, 'CREATE', 'fulfillment', result.fulfillment?.id, 'success', { 
      order_id: req.params.orderId 
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Fulfillment create failed:', error.message);
    await logOperation(req, 'CREATE', 'fulfillment', null, 'error', { error: error.message });
    res.status(500).json({ error: 'Failed to create fulfillment', message: error.message });
  }
});

// ===== ACTIVITY LOGS =====

/**
 * GET /api/logs - Get sync activity logs
 */
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const logs = await syncLogService.getLogsByStore(req.storeId, limit, offset);
    
    res.json({ logs, limit, offset });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs', message: error.message });
  }
});

/**
 * GET /api/stats - Get activity statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const summary = await syncLogService.getActivitySummary(req.storeId, hours);
    
    res.json({ summary, hours });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats', message: error.message });
  }
});

// ===== TEST CONNECTION =====

/**
 * GET /api/test-connection - Test Shopify connection
 */
router.get('/test-connection', async (req, res) => {
  try {
    console.log('=== Testing Shopify Connection ===');
    console.log('Shop:', req.shopDomain);
    console.log('Scopes:', req.scopes);
    
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const shopInfo = await shopify.request('GET', '/shop.json');
    
    res.json({
      success: true,
      shop: shopInfo.shop.name,
      domain: shopInfo.shop.domain,
      scopes: req.scopes,
      message: '✅ Shopify connection is working perfectly!'
    });
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data,
      message: 'Connection failed. Please reinstall the app or check your access token.'
    });
  }
});

/**
 * GET /api/debug-token - Debug access token
 */
router.get('/debug-token', async (req, res) => {
  try {
    console.log('=== DEBUG TOKEN ===');
    console.log('Shop Domain:', req.shopDomain);
    console.log('Store ID:', req.storeId);
    console.log('Access Token exists:', !!req.accessToken);
    console.log('Access Token preview:', req.accessToken ? req.accessToken.substring(0, 15) + '...' : 'MISSING');
    console.log('API Key ID:', req.apiKeyId);
    console.log('Scopes:', req.scopes);
    
    // Try to call Shopify shop endpoint (simplest call)
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    
    console.log('Base URL:', shopify.baseUrl);
    console.log('Attempting to call /shop.json...');
    
    const shopInfo = await shopify.request('GET', '/shop.json');
    
    res.json({
      success: true,
      message: 'Access token is valid!',
      shop: shopInfo.shop.name,
      domain: shopInfo.shop.domain,
      email: shopInfo.shop.email,
      debugInfo: {
        shopDomain: req.shopDomain,
        apiVersion: shopify.apiVersion,
        baseUrl: shopify.baseUrl,
        hasAccessToken: !!req.accessToken,
        scopes: req.scopes
      }
    });
  } catch (error) {
    console.error('❌ Token debug failed');
    console.error('Error:', error.message);
    console.error('Response:', error.response?.data);
    console.error('Status:', error.response?.status);
    
    res.status(500).json({
      success: false,
      error: error.message,
      shopifyError: error.response?.data,
      statusCode: error.response?.status,
      debugInfo: {
        shopDomain: req.shopDomain,
        hasAccessToken: !!req.accessToken,
        tokenPreview: req.accessToken ? req.accessToken.substring(0, 15) + '...' : 'MISSING'
      }
    });
  }
});


module.exports = router;