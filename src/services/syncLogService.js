const pool = require('../database/db');

class SyncLogService {
  /**
   * Log a sync operation
   */
  async logSync(storeId, apiKeyId, action, resourceType, resourceId, status, details = null) {
    const query = `
      INSERT INTO sync_logs (store_id, api_key_id, action, resource_type, resource_id, status, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      storeId,
      apiKeyId,
      action,
      resourceType,
      resourceId,
      status,
      details ? JSON.stringify(details) : null
    ]);
    
    return result.rows[0];
  }

  /**
   * Get logs for a store
   */
  async getLogsByStore(storeId, limit = 100, offset = 0) {
    const query = `
      SELECT * FROM sync_logs
      WHERE store_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [storeId, limit, offset]);
    return result.rows;
  }

  /**
   * Get logs by resource type
   */
  async getLogsByResourceType(storeId, resourceType, limit = 100) {
    const query = `
      SELECT * FROM sync_logs
      WHERE store_id = $1 AND resource_type = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;
    
    const result = await pool.query(query, [storeId, resourceType, limit]);
    return result.rows;
  }

  /**
   * Get recent activity summary
   */
  async getActivitySummary(storeId, hours = 24) {
    const query = `
      SELECT 
        resource_type,
        action,
        status,
        COUNT(*) as count
      FROM sync_logs
      WHERE store_id = $1
        AND created_at > NOW() - INTERVAL '${hours} hours'
      GROUP BY resource_type, action, status
      ORDER BY count DESC
    `;
    
    const result = await pool.query(query, [storeId]);
    return result.rows;
  }

  /**
   * Delete old logs (cleanup)
   */
  async deleteOldLogs(daysToKeep = 30) {
    const query = `
      DELETE FROM sync_logs
      WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
    `;
    
    const result = await pool.query(query);
    return result.rowCount;
  }
}

module.exports = new SyncLogService();
