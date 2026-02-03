const pool = require('../database/db');
const { generateApiKey, generateApiSecret, encrypt, decrypt, hashApiKey } = require('../utils/crypto');

class ApiKeyService {
  /**
   * Create a new API key for a store
   */
  async createApiKey(storeId, name, scopes) {
    const apiKey = generateApiKey();
    const apiSecret = generateApiSecret();
    const hashedKey = hashApiKey(apiKey);
    const encryptedSecret = encrypt(apiSecret);
    
    const query = `
      INSERT INTO api_keys (store_id, api_key, api_secret, name, scopes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, api_key, name, scopes, created_at, is_active
    `;
    
    const result = await pool.query(query, [storeId, hashedKey, encryptedSecret, name, scopes]);
    
    return {
      ...result.rows[0],
      api_key: apiKey,
      api_secret: apiSecret
    };
  }

  /**
   * Get API key by key string (for authentication)
   */
  async getApiKeyByKey(apiKey) {
    const hashedKey = hashApiKey(apiKey);
    
    const query = `
      SELECT ak.*, s.shop_domain, s.access_token
      FROM api_keys ak
      JOIN stores s ON ak.store_id = s.id
      WHERE ak.api_key = $1 AND ak.is_active = true AND s.is_active = true
    `;
    
    const result = await pool.query(query, [hashedKey]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const keyData = result.rows[0];
    keyData.access_token = decrypt(keyData.access_token);
    
    return keyData;
  }

  /**
   * Get all API keys for a store
   */
  async getApiKeysByStore(storeId) {
    const query = `
      SELECT id, name, scopes, created_at, last_used_at, is_active
      FROM api_keys
      WHERE store_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [storeId]);
    return result.rows;
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(apiKeyId) {
    const query = 'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1';
    await pool.query(query, [apiKeyId]);
  }

  /**
   * Deactivate an API key
   */
  async deactivateApiKey(apiKeyId, storeId) {
    const query = 'UPDATE api_keys SET is_active = false WHERE id = $1 AND store_id = $2';
    const result = await pool.query(query, [apiKeyId, storeId]);
    return result.rowCount > 0;
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(apiKeyId, storeId) {
    const query = 'DELETE FROM api_keys WHERE id = $1 AND store_id = $2';
    const result = await pool.query(query, [apiKeyId, storeId]);
    return result.rowCount > 0;
  }

  /**
   * Rotate API key (generate new key for existing entry)
   */
  async rotateApiKey(apiKeyId, storeId) {
    const apiKey = generateApiKey();
    const apiSecret = generateApiSecret();
    const hashedKey = hashApiKey(apiKey);
    const encryptedSecret = encrypt(apiSecret);
    
    const query = `
      UPDATE api_keys
      SET api_key = $1, api_secret = $2
      WHERE id = $3 AND store_id = $4
      RETURNING id, name, scopes, created_at, is_active
    `;
    
    const result = await pool.query(query, [hashedKey, encryptedSecret, apiKeyId, storeId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return {
      ...result.rows[0],
      api_key: apiKey,
      api_secret: apiSecret
    };
  }
}

module.exports = new ApiKeyService();
