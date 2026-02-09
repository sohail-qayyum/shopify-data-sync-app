const express = require('express');
const router = express.Router();
const { verifyApiKey, apiLimiter } = require('../middleware/auth');
const { ShopifyAPI } = require('../utils/shopify');
const syncLogService = require('../services/syncLogService');

// Apply rate limiting to all API routes
router.use(apiLimiter);

// Apply API key authentication to all routes (except health)
router.use((req, res, next) => {
  if (req.path === '/health') return next();
  verifyApiKey(req, res, next);
});

/**
 * GET /api/health - Health check
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api' });
});

/**
 * Helper function to check scope
 */
function requireScope(scope) {
  return (req, res, next) => {
    // Basic check first
    if (req.scopes && req.scopes.includes(scope)) {
      return next();
    }

    // If we need a 'read_' scope, a 'write_' scope for the same resource is also sufficient
    if (scope.startsWith('read_')) {
      const writeScope = scope.replace('read_', 'write_');
      if (req.scopes && req.scopes.includes(writeScope)) {
        return next();
      }
    }

    // If not found, return unauthorized
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: `Your API key lacks the '${scope}' scope required for this request.`,
      yourScopes: req.scopes,
      requiredScope: scope
    });
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

    await logOperation(req, 'READ', 'order', null, 'error', { error: error.message, shopifyError: error.shopifyMessage });
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: error.message,
      shopifyError: error.shopifyMessage,
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
    await logOperation(req, 'READ', 'order', req.params.id, 'error', { error: error.message, shopifyError: error.shopifyMessage });
    res.status(500).json({
      error: 'Failed to fetch order',
      message: error.message,
      shopifyError: error.shopifyMessage
    });
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
    await logOperation(req, 'UPDATE', 'order', req.params.id, 'error', { error: error.message, shopifyError: error.shopifyMessage });
    res.status(500).json({
      error: 'Failed to update order',
      message: error.message,
      shopifyError: error.shopifyMessage
    });
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

// ===== DYNAMIC RESOURCE ACCESS (v1) =====

/**
 * GET /api/v1/resources - List available resources based on scopes
 */
router.get('/v1/resources', (req, res) => {
  const available = (req.scopes || [])
    .filter(s => s.startsWith('read_'))
    .map(s => {
      const resource = s.replace('read_', '');
      return {
        resource: resource,
        endpoint: `/api/v1/${resource}`,
        scope: s
      };
    });

  res.json({ success: true, resources: available });
});

/**
 * GET /api/v1/:resource - Dynamic resource fetcher
 */
router.get('/v1/:resource', async (req, res) => {
  const { resource } = req.params;
  const scopeMap = {
    'orders': 'read_orders',
    'customers': 'read_customers',
    'products': 'read_products',
    'inventory': 'read_inventory',
    'fulfillments': 'read_fulfillments',
    'fulfillment_orders': 'read_fulfillments',
    'locations': 'read_locations',
    'returns': 'read_returns',
    'discounts': 'read_discounts',
    'price_rules': 'read_price_rules',
    'draft_orders': 'read_draft_orders'
  };

  // Infer scope if not in map (e.g., 'gift_cards' -> 'read_gift_cards')
  const requiredScope = scopeMap[resource] || `read_${resource}`;

  // Check if user has the required scope OR the corresponding write scope
  const writeScope = requiredScope.replace('read_', 'write_');
  const hasPermission = req.scopes && (
    req.scopes.includes(requiredScope) ||
    req.scopes.includes(writeScope)
  );

  if (!hasPermission) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: `Your API key lacks the '${requiredScope}' scope required for '${resource}'. Note: 'write_' scopes also grant 'read_' access.`,
      requiredScope,
      yourScopes: req.scopes
    });
  }

  try {
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    let result;

    switch (resource) {
      case 'orders': result = await shopify.getOrders(req.query); break;
      case 'customers': result = await shopify.getCustomers(req.query); break;
      case 'products': result = await shopify.getProducts(req.query); break;
      case 'inventory':
        // If location_id is missing, auto-fetch and use primary location
        if (!req.query.location_ids && !req.query.location_id) {
          const locations = await shopify.getLocations();
          if (locations && locations.locations && locations.locations.length > 0) {
            const primaryLocation = locations.locations[0];
            req.query.location_ids = primaryLocation.id;
          } else {
            return res.status(422).json({ error: 'No locations found', message: 'Shopify store must have at least one location for inventory.' });
          }
        }
        result = await shopify.getInventoryLevels(req.query);
        break;
      case 'locations': result = await shopify.getLocations(); break;
      case 'fulfillment_orders':
        if (!req.query.order_id) return res.status(400).json({ error: 'Missing order_id' });
        result = await shopify.getFulfillmentOrders(req.query.order_id);
        break;
      case 'fulfillments':
        if (!req.query.order_id) {
          return res.status(400).json({
            error: 'Missing order_id',
            message: 'Please provide an order_id parameter, e.g., /api/v1/fulfillments?order_id=123456789'
          });
        }
        result = await shopify.getFulfillments(req.query.order_id);
        break;
      case 'returns': result = await shopify.getReturns(req.query); break;
      case 'price_rules': result = await shopify.getPriceRules(req.query); break;
      case 'discounts': result = await shopify.getDiscounts(req.query); break;
      case 'draft_orders': result = await shopify.getDraftOrders(req.query); break;
      default:
        // Future-proof fallback for other resources
        result = await shopify.getResource(resource, req.query);
        break;
    }

    res.json({ success: true, resource, data: result });
  } catch (error) {
    res.status(500).json({
      error: `Failed to fetch ${resource}`,
      message: error.message,
      shopifyError: error.shopifyMessage
    });
  }
});

/**
 * POST /api/v1/:resource - Create resource
 */
router.post('/v1/:resource', async (req, res) => {
  const { resource } = req.params;
  const requiredScope = `write_${resource}`;

  if (!req.scopes || !req.scopes.includes(requiredScope)) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: `Your API key lacks the '${requiredScope}' scope required to create '${resource}'`,
      requiredScope
    });
  }

  try {
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.createResource(resource, req.body);

    await logOperation(req, 'CREATE', resource, result[Object.keys(result)[0]]?.id, 'success');
    res.status(201).json({ success: true, resource, data: result });
  } catch (error) {
    res.status(500).json({
      error: `Failed to create ${resource}`,
      message: error.message,
      shopifyError: error.shopifyMessage
    });
  }
});

/**
 * PUT /api/v1/:resource/:id - Update resource
 */
router.put('/v1/:resource/:id', async (req, res) => {
  const { resource, id } = req.params;
  const requiredScope = `write_${resource}`;

  if (!req.scopes || !req.scopes.includes(requiredScope)) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: `Your API key lacks the '${requiredScope}' scope required to update '${resource}'`,
      requiredScope
    });
  }

  try {
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    const result = await shopify.updateResource(resource, id, req.body);

    await logOperation(req, 'UPDATE', resource, id, 'success');
    res.json({ success: true, resource, data: result });
  } catch (error) {
    res.status(500).json({
      error: `Failed to update ${resource}`,
      message: error.message,
      shopifyError: error.shopifyMessage
    });
  }
});

/**
 * DELETE /api/v1/:resource/:id - Delete resource
 */
router.delete('/v1/:resource/:id', async (req, res) => {
  const { resource, id } = req.params;
  const requiredScope = `write_${resource}`;

  if (!req.scopes || !req.scopes.includes(requiredScope)) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: `Your API key lacks the '${requiredScope}' scope required to delete '${resource}'`,
      requiredScope
    });
  }

  try {
    const shopify = new ShopifyAPI(req.shopDomain, req.accessToken);
    await shopify.deleteResource(resource, id);

    await logOperation(req, 'DELETE', resource, id, 'success');
    res.json({ success: true, message: `${resource} ${id} deleted successfully` });
  } catch (error) {
    res.status(500).json({
      error: `Failed to delete ${resource}`,
      message: error.message,
      shopifyError: error.shopifyMessage
    });
  }
});

// ===== TEST CONNECTION =====

/**
 * GET /api/test-connection - Test Shopify connection
 */
router.get('/test-connection', async (req, res) => {
  try {

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
      shopifyError: error.shopifyMessage || error.response?.data,
      statusCode: error.response?.status,
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
        tokenType: req.accessToken?.startsWith('shpca_') ? 'Custom App' : 'OAuth',
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