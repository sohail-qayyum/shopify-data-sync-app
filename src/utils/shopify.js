const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');

class ShopifyAPI {
  constructor(shop, accessToken) {
    this.shop = shop;
    this.accessToken = accessToken;
    this.apiVersion = config.shopify.apiVersion;
    this.baseUrl = `https://${shop.replace(/\/+$/, '')}/admin/api/${this.apiVersion}`;
  }

  /**
   * Make API request to Shopify
   */
  async request(method, endpoint, data = null) {
    try {
      // Ensure endpoint starts with a slash and handle potential double slashes
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const url = `${this.baseUrl}${cleanEndpoint}`.replace(/([^:]\/)\/+/g, "$1");

      const headers = {
        'X-Shopify-Access-Token': this.accessToken,
        'Accept': 'application/json',
        'User-Agent': 'ShopifyDataSyncApp/1.0.0 (Node.js)'
      };

      // Only add Content-Type if there is a body
      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        headers['Content-Type'] = 'application/json';
      }

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
      const errorDetails = {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      };

      console.error('❌ Shopify API Error Details:', JSON.stringify(errorDetails, null, 2));

      // Log more context for 400 errors
      if (error.response?.status === 400) {
        console.error('  Raw Response Body:', JSON.stringify(error.response.data));
        console.error('  Response Headers:', JSON.stringify(error.response.headers));
      }

      // Enhance the error object with Shopify's specific error message if available
      if (error.response?.data?.errors) {
        const shopifyErrors = error.response.data.errors;
        error.shopifyMessage = typeof shopifyErrors === 'string'
          ? shopifyErrors
          : JSON.stringify(shopifyErrors);
      }

      throw error;
    }
  }

  // Orders
  async getOrders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/orders.json?${queryString}` : '/orders.json';
    return this.request('GET', endpoint);
  }

  async getOrder(orderId) {
    return this.request('GET', `/orders/${orderId}.json`);
  }

  async updateOrder(orderId, orderData) {
    return this.request('PUT', `/orders/${orderId}.json`, { order: orderData });
  }

  // Draft Orders
  async getDraftOrders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/draft_orders.json?${queryString}` : '/draft_orders.json';
    return this.request('GET', endpoint);
  }

  /**
   * Generic Resource Fetcher (for future-proofing)
   */
  async getResource(resource, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/${resource}.json?${queryString}` : `/${resource}.json`;
    return this.request('GET', endpoint);
  }

  // Customers
  async getCustomers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/customers.json?${queryString}` : '/customers.json';
    return this.request('GET', endpoint);
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
    const endpoint = queryString ? `/products.json?${queryString}` : '/products.json';
    return this.request('GET', endpoint);
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
    const endpoint = queryString ? `/inventory_levels.json?${queryString}` : '/inventory_levels.json';
    return this.request('GET', endpoint);
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

  // Fulfillment Orders
  async getFulfillmentOrders(orderId) {
    return this.request('GET', `/orders/${orderId}/fulfillment_orders.json`);
  }

  // Returns
  async getReturns(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/returns.json?${queryString}` : '/returns.json';
    return this.request('GET', endpoint);
  }

  // Discounts & Price Rules
  async getPriceRules(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/price_rules.json?${queryString}` : '/price_rules.json';
    return this.request('GET', endpoint);
  }

  async getDiscounts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/discounts.json?${queryString}` : '/discounts.json';
    return this.request('GET', endpoint);
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
