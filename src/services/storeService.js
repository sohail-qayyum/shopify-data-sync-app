const pool = require('../database/db');
const { encrypt, decrypt } = require('../utils/crypto');

class StoreService {
  /**
   * Create or update a store
   */
  async upsertStore(shopDomain, accessToken, scopes) {
    const encryptedToken = encrypt(accessToken);
    
    const query = `
      INSERT INTO stores (shop_domain, access_token, scopes, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (shop_domain)
      DO UPDATE SET
        access_token = $2,
        scopes = $3,
        updated_at = CURRENT_TIMESTAMP,
        is_active = true
      RETURNING *
    `;
    
    const result = await pool.query(query, [shopDomain, encryptedToken, scopes]);
    return result.rows[0];
  }

  /**
   * Get store by shop domain
   */
  async getStoreByDomain(shopDomain) {
    const query = 'SELECT * FROM stores WHERE shop_domain = $1 AND is_active = true';
    const result = await pool.query(query, [shopDomain]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const store = result.rows[0];
    store.access_token = decrypt(store.access_token);
    return store;
  }

  /**
   * Get store by ID
   */
  async getStoreById(storeId) {
    const query = 'SELECT * FROM stores WHERE id = $1 AND is_active = true';
    const result = await pool.query(query, [storeId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const store = result.rows[0];
    store.access_token = decrypt(store.access_token);
    return store;
  }

  /**
   * Get all active stores
   */
  async getAllStores() {
    const query = 'SELECT * FROM stores WHERE is_active = true ORDER BY installed_at DESC';
    const result = await pool.query(query);
    
    return result.rows.map(store => ({
      ...store,
      access_token: decrypt(store.access_token)
    }));
  }

  /**
   * Deactivate a store
   */
  async deactivateStore(shopDomain) {
    const query = 'UPDATE stores SET is_active = false WHERE shop_domain = $1';
    await pool.query(query, [shopDomain]);
  }

  /**
   * Delete a store
   */
  async deleteStore(shopDomain) {
    const query = 'DELETE FROM stores WHERE shop_domain = $1';
    await pool.query(query, [shopDomain]);
  }
}

module.exports = new StoreService();
