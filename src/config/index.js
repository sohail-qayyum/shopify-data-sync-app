require('dotenv').config();

module.exports = {
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecret: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SHOPIFY_SCOPES || 'read_orders,write_orders,read_customers,write_customers,read_products,write_products,read_inventory,write_inventory,read_fulfillments,write_fulfillments,read_locations,read_product_listings',
    apiVersion: '2024-10'
  },
  
  app: {
    url: process.env.APP_URL,
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  
  security: {
    jwtSecret: process.env.JWT_SECRET,
    apiKeyEncryptionSecret: process.env.API_KEY_ENCRYPTION_SECRET,
    sessionSecret: process.env.SESSION_SECRET
  },
  
  webhooks: {
    topics: [
      'orders/create',
      'orders/updated',
      'orders/cancelled',
      'customers/create',
      'customers/update',
      'products/create',
      'products/update',
      'products/delete',
      'inventory_levels/update',
      'fulfillments/create',
      'fulfillments/update'
    ]
  }
};
