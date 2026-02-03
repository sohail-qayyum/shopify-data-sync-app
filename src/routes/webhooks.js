const express = require('express');
const router = express.Router();
const { verifyWebhook } = require('../utils/shopify');
const storeService = require('../services/storeService');
const syncLogService = require('../services/syncLogService');

/**
 * Middleware to verify webhook authenticity
 */
async function verifyWebhookMiddleware(req, res, next) {
  const hmac = req.get('X-Shopify-Hmac-SHA256');
  const shop = req.get('X-Shopify-Shop-Domain');
  
  if (!hmac || !shop) {
    return res.status(401).send('Unauthorized');
  }
  
  // Get raw body for HMAC verification
  const rawBody = JSON.stringify(req.body);
  
  if (!verifyWebhook(rawBody, hmac)) {
    console.error('Invalid webhook HMAC');
    return res.status(401).send('Unauthorized');
  }
  
  // Get store from database
  const store = await storeService.getStoreByDomain(shop);
  if (!store) {
    console.error('Store not found:', shop);
    return res.status(404).send('Store not found');
  }
  
  req.store = store;
  next();
}

router.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
router.use(verifyWebhookMiddleware);

/**
 * Helper to log webhook event
 */
async function logWebhookEvent(storeId, topic, resourceId, data) {
  try {
    const [resourceType, action] = topic.split('/');
    await syncLogService.logSync(
      storeId,
      null,
      `WEBHOOK_${action.toUpperCase()}`,
      resourceType,
      resourceId,
      'received',
      { webhook_topic: topic, data }
    );
  } catch (error) {
    console.error('Error logging webhook:', error);
  }
}

// ===== ORDER WEBHOOKS =====

/**
 * POST /webhooks/orders-create
 */
router.post('/orders-create', async (req, res) => {
  const order = req.body;
  console.log(`📦 Order created: ${order.id} for ${req.store.shop_domain}`);
  
  await logWebhookEvent(req.store.id, 'orders/create', order.id, { 
    order_number: order.order_number,
    total_price: order.total_price,
    customer: order.customer?.email
  });
  
  // Here you can add custom logic:
  // - Send notification to your portal
  // - Update local database
  // - Trigger other processes
  
  res.status(200).send('OK');
});

/**
 * POST /webhooks/orders-updated
 */
router.post('/orders-updated', async (req, res) => {
  const order = req.body;
  console.log(`📝 Order updated: ${order.id} for ${req.store.shop_domain}`);
  
  await logWebhookEvent(req.store.id, 'orders/updated', order.id, {
    order_number: order.order_number,
    financial_status: order.financial_status,
    fulfillment_status: order.fulfillment_status
  });
  
  res.status(200).send('OK');
});

/**
 * POST /webhooks/orders-cancelled
 */
router.post('/orders-cancelled', async (req, res) => {
  const order = req.body;
  console.log(`❌ Order cancelled: ${order.id} for ${req.store.shop_domain}`);
  
  await logWebhookEvent(req.store.id, 'orders/cancelled', order.id, {
    order_number: order.order_number,
    cancelled_at: order.cancelled_at
  });
  
  res.status(200).send('OK');
});

// ===== CUSTOMER WEBHOOKS =====

/**
 * POST /webhooks/customers-create
 */
router.post('/customers-create', async (req, res) => {
  const customer = req.body;
  console.log(`👤 Customer created: ${customer.id} for ${req.store.shop_domain}`);
  
  await logWebhookEvent(req.store.id, 'customers/create', customer.id, {
    email: customer.email,
    name: `${customer.first_name} ${customer.last_name}`
  });
  
  res.status(200).send('OK');
});

/**
 * POST /webhooks/customers-update
 */
router.post('/customers-update', async (req, res) => {
  const customer = req.body;
  console.log(`👤 Customer updated: ${customer.id} for ${req.store.shop_domain}`);
  
  await logWebhookEvent(req.store.id, 'customers/update', customer.id, {
    email: customer.email,
    updated_at: customer.updated_at
  });
  
  res.status(200).send('OK');
});

// ===== PRODUCT WEBHOOKS =====

/**
 * POST /webhooks/products-create
 */
router.post('/products-create', async (req, res) => {
  const product = req.body;
  console.log(`🛍️ Product created: ${product.id} for ${req.store.shop_domain}`);
  
  await logWebhookEvent(req.store.id, 'products/create', product.id, {
    title: product.title,
    variants_count: product.variants?.length || 0
  });
  
  res.status(200).send('OK');
});

/**
 * POST /webhooks/products-update
 */
router.post('/products-update', async (req, res) => {
  const product = req.body;
  console.log(`🛍️ Product updated: ${product.id} for ${req.store.shop_domain}`);
  
  await logWebhookEvent(req.store.id, 'products/update', product.id, {
    title: product.title,
    status: product.status
  });
  
  res.status(200).send('OK');
});

/**
 * POST /webhooks/products-delete
 */
router.post('/products-delete', async (req, res) => {
  const product = req.body;
  console.log(`🗑️ Product deleted: ${product.id} for ${req.store.shop_domain}`);
  
  await logWebhookEvent(req.store.id, 'products/delete', product.id, {
    title: product.title
  });
  
  res.status(200).send('OK');
});

// ===== INVENTORY WEBHOOKS =====

/**
 * POST /webhooks/inventory_levels-update
 */
router.post('/inventory_levels-update', async (req, res) => {
  const inventoryLevel = req.body;
  console.log(`📊 Inventory updated: Item ${inventoryLevel.inventory_item_id} for ${req.store.shop_domain}`);
  
  await logWebhookEvent(req.store.id, 'inventory_levels/update', inventoryLevel.inventory_item_id, {
    location_id: inventoryLevel.location_id,
    available: inventoryLevel.available
  });
  
  res.status(200).send('OK');
});

// ===== FULFILLMENT WEBHOOKS =====

/**
 * POST /webhooks/fulfillments-create
 */
router.post('/fulfillments-create', async (req, res) => {
  const fulfillment = req.body;
  console.log(`📮 Fulfillment created: ${fulfillment.id} for ${req.store.shop_domain}`);
  
  await logWebhookEvent(req.store.id, 'fulfillments/create', fulfillment.id, {
    order_id: fulfillment.order_id,
    status: fulfillment.status,
    tracking_number: fulfillment.tracking_number
  });
  
  res.status(200).send('OK');
});

/**
 * POST /webhooks/fulfillments-update
 */
router.post('/fulfillments-update', async (req, res) => {
  const fulfillment = req.body;
  console.log(`📮 Fulfillment updated: ${fulfillment.id} for ${req.store.shop_domain}`);
  
  await logWebhookEvent(req.store.id, 'fulfillments/update', fulfillment.id, {
    order_id: fulfillment.order_id,
    status: fulfillment.status
  });
  
  res.status(200).send('OK');
});

// ===== APP UNINSTALLED =====

/**
 * POST /webhooks/app-uninstalled
 */
router.post('/app-uninstalled', async (req, res) => {
  console.log(`🔴 App uninstalled for ${req.store.shop_domain}`);
  
  await storeService.deactivateStore(req.store.shop_domain);
  
  res.status(200).send('OK');
});

module.exports = router;
