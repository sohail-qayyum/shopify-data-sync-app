const pool = require('../database/db');
const { ShopifyAPI } = require('../utils/shopify');
const config = require('../config');

class WebhookService {
  /**
   * Register all webhooks for a store
   */
  async registerWebhooks(store) {
    const shopify = new ShopifyAPI(store.shop_domain, store.access_token);
    const webhookAddress = `${config.app.url}/webhooks`;
    
    const registeredWebhooks = [];
    
    for (const topic of config.webhooks.topics) {
      try {
        const response = await shopify.createWebhook(topic, `${webhookAddress}/${topic.replace('/', '-')}`);
        
        if (response.webhook) {
          await this.saveWebhook(store.id, response.webhook.id, topic, response.webhook.address);
          registeredWebhooks.push(response.webhook);
          console.log(`✅ Registered webhook: ${topic} for ${store.shop_domain}`);
        }
      } catch (error) {
        console.error(`❌ Failed to register webhook ${topic}:`, error.response?.data || error.message);
      }
    }
    
    return registeredWebhooks;
  }

  /**
   * Save webhook to database
   */
  async saveWebhook(storeId, webhookId, topic, address) {
    const query = `
      INSERT INTO webhooks (store_id, webhook_id, topic, address)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (store_id, topic)
      DO UPDATE SET webhook_id = $2, address = $4
      RETURNING *
    `;
    
    const result = await pool.query(query, [storeId, webhookId, topic, address]);
    return result.rows[0];
  }

  /**
   * Get webhooks for a store
   */
  async getWebhooksByStore(storeId) {
    const query = 'SELECT * FROM webhooks WHERE store_id = $1';
    const result = await pool.query(query, [storeId]);
    return result.rows;
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(storeId, topic) {
    const query = 'DELETE FROM webhooks WHERE store_id = $1 AND topic = $2 RETURNING *';
    const result = await pool.query(query, [storeId, topic]);
    return result.rows[0];
  }

  /**
   * Delete all webhooks for a store
   */
  async deleteAllWebhooks(storeId) {
    const query = 'DELETE FROM webhooks WHERE store_id = $1';
    await pool.query(query, [storeId]);
  }

  /**
   * Unregister all webhooks from Shopify and database
   */
  async unregisterWebhooks(store) {
    const shopify = new ShopifyAPI(store.shop_domain, store.access_token);
    
    try {
      const webhooksResponse = await shopify.getWebhooks();
      
      for (const webhook of webhooksResponse.webhooks || []) {
        try {
          await shopify.deleteWebhook(webhook.id);
          console.log(`✅ Deleted webhook: ${webhook.topic} for ${store.shop_domain}`);
        } catch (error) {
          console.error(`❌ Failed to delete webhook ${webhook.id}:`, error.message);
        }
      }
      
      await this.deleteAllWebhooks(store.id);
    } catch (error) {
      console.error('Error unregistering webhooks:', error);
    }
  }
}

module.exports = new WebhookService();
