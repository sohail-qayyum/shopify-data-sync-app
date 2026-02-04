const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');

class ShopifyAPI {
  constructor(shop, accessToken) {
    this.shop = shop;
    this.accessToken = accessToken;
    this.apiVersion = config.shopify.apiVersion;
    this.baseUrl = `https://${shop}/admin/api/${this.apiVersion}`;
  }

 /**
 * Make API request to Shopify
 */
async request(method, endpoint, data = null) {
  try {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'X-Shopify-Access-Token': this.accessToken,
      'Content-Type': 'application/json'
    };

    console.log('🔵 Shopify API Request:');
    console.log('  Method:', method);
    console.log('  URL:', url);
    console.log('  Endpoint:', endpoint);
    console.log('  Has Access Token:', !!this.accessToken);
    console.log('  Token Preview:', this.accessToken ? this.accessToken.substring(0, 10) + '...' : 'MISSING');

    const response = await axios({
      method,
      url,
      headers,
      data
    });

    console.log('✅ Shopify API Success:', response.status);
    return response.data;
  } catch (error) {
    console.error('❌ Shopify API Error Details:');
    console.error('  Status:', error.response?.status);
    console.error('  Status Text:', error.response?.statusText);
    console.error('  Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('  Request URL:', error.config?.url);
    console.error('  Request Method:', error.config?.method);
    
    throw error;
  }
}

  // Orders
  async getOrders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/orders.json?${queryString}`);
  }

  async getOrder(orderId) {
    return this.request('GET', `/orders/${orderId}.json`);
  }

  async updateOrder(orderId, orderData) {
    return this.request('PUT', `/orders/${orderId}.json`, { order: orderData });
  }

  // Customers
  async getCustomers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/customers.json?${queryString}`);
  }

  async getCustomer(customerId) {
    return this.request('GET', `/customers/${customerId}.json`);
  }

  async updateCustomer(customerId, customerData) {
    return this.request('PUT', `/customers/${customerId}.json`, { customer: customerData });
  }

  // Products
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/products.json?${queryString}`);
  }

  async getProduct(productId) {
    return this.request('GET', `/products/${productId}.json`);
  }

  async updateProduct(productId, productData) {
    return this.request('PUT', `/products/${productId}.json`, { product: productData });
  }

  async createProduct(productData) {
    return this.request('POST', `/products.json`, { product: productData });
  }

  // Inventory
  async getInventoryLevels(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/inventory_levels.json?${queryString}`);
  }

  async updateInventoryLevel(inventoryItemId, locationId, available) {
    return this.request('POST', `/inventory_levels/set.json`, {
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available: available
    });
  }

  // Locations
  async getLocations() {
    return this.request('GET', `/locations.json`);
  }

  // Fulfillments
  async getFulfillments(orderId) {
    return this.request('GET', `/orders/${orderId}/fulfillments.json`);
  }

  async createFulfillment(orderId, fulfillmentData) {
    return this.request('POST', `/orders/${orderId}/fulfillments.json`, { fulfillment: fulfillmentData });
  }

  // Webhooks
  async createWebhook(topic, address) {
    return this.request('POST', `/webhooks.json`, {
      webhook: {
        topic,
        address,
        format: 'json'
      }
    });
  }

  async getWebhooks() {
    return this.request('GET', `/webhooks.json`);
  }

  async deleteWebhook(webhookId) {
    return this.request('DELETE', `/webhooks/${webhookId}.json`);
  }
}

/**
 * Verify Shopify webhook HMAC
 */
function verifyWebhook(data, hmacHeader) {
  const hash = crypto
    .createHmac('sha256', config.shopify.apiSecret)
    .update(data, 'utf8')
    .digest('base64');
  
  return hash === hmacHeader;
}

/**
 * Verify Shopify request signature
 */
function verifyShopifyRequest(query) {
  const { hmac, ...params } = query;
  
  const message = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const hash = crypto
    .createHmac('sha256', config.shopify.apiSecret)
    .update(message)
    .digest('hex');
  
  return hash === hmac;
}

/**
 * Generate nonce for OAuth
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Build authorization URL for OAuth
 */
function buildAuthUrl(shop, state, redirectUri) {
  const scopes = config.shopify.scopes;
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${config.shopify.apiKey}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;
  return authUrl;
}

/**
 * Exchange code for access token
 */
async function getAccessToken(shop, code) {
  try {
    const response = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: config.shopify.apiKey,
      client_secret: config.shopify.apiSecret,
      code
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

module.exports = {
  ShopifyAPI,
  verifyWebhook,
  verifyShopifyRequest,
  generateNonce,
  buildAuthUrl,
  getAccessToken
};
