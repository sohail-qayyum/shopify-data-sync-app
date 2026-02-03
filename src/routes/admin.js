const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const storeService = require('../services/storeService');
const apiKeyService = require('../services/apiKeyService');
const webhookService = require('../services/webhookService');
const syncLogService = require('../services/syncLogService');
const config = require('../config');

/**
 * GET /admin - Serve admin UI (embedded in Shopify)
 */
router.get('/admin', (req, res) => {
  const { shop, token } = req.query;
  
  if (!shop) {
    return res.status(400).send('Missing shop parameter');
  }
  
  // Serve embedded admin page
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Shopify Data Sync App - Admin</title>
      <link rel="stylesheet" href="https://unpkg.com/@shopify/polaris@12.0.0/build/esm/styles.css">
      <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #5c6ac4; color: white; padding: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 24px; }
        .card { background: white; border: 1px solid #dfe3e8; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .card h2 { margin-top: 0; font-size: 18px; color: #212b36; }
        .button { background: #5c6ac4; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; }
        .button:hover { background: #4a5ab3; }
        .button-danger { background: #de3618; }
        .button-danger:hover { background: #c5280c; }
        .input { width: 100%; padding: 10px; border: 1px solid #c4cdd5; border-radius: 4px; font-size: 14px; margin-bottom: 10px; box-sizing: border-box; }
        .api-key-item { background: #f9fafb; padding: 15px; margin-bottom: 10px; border-radius: 4px; border: 1px solid #dfe3e8; }
        .api-key-item h3 { margin: 0 0 10px 0; font-size: 16px; }
        .api-key-item p { margin: 5px 0; font-size: 14px; color: #637381; }
        .code { background: #f4f6f8; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; word-break: break-all; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
        .badge-success { background: #aee9d1; color: #108043; }
        .badge-inactive { background: #e4e5e7; color: #637381; }
        .endpoints { background: #f9fafb; padding: 15px; border-radius: 4px; margin-top: 15px; }
        .endpoint { margin: 10px 0; }
        .endpoint-method { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-right: 10px; }
        .method-get { background: #b4e7ce; color: #0c5132; }
        .method-post { background: #ffd79d; color: #7f2d00; }
        .method-put { background: #b4dafe; color: #004085; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: white; border: 1px solid #dfe3e8; border-radius: 8px; padding: 20px; text-align: center; }
        .stat-value { font-size: 32px; font-weight: 700; color: #5c6ac4; margin: 10px 0; }
        .stat-label { color: #637381; font-size: 14px; }
        .loading { text-align: center; padding: 40px; color: #637381; }
        .error { background: #fbeae5; border: 1px solid #de3618; color: #c5280c; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        .success { background: #e3f1df; border: 1px solid #50b83c; color: #108043; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔄 Shopify Data Sync App</h1>
        <p style="margin: 5px 0 0 0;">Manage API keys and monitor sync activity</p>
      </div>
      
      <div class="container">
        <div id="app">
          <div class="loading">Loading...</div>
        </div>
      </div>

      <script>
        const API_URL = '${config.app.url}';
        const SHOP = '${shop}';
        const TOKEN = '${token}';

        let storeData = null;
        let apiKeys = [];

        async function fetchData() {
          try {
            const response = await fetch(\`\${API_URL}/api/admin/store\`, {
              headers: {
                'Authorization': \`Bearer \${TOKEN}\`,
                'Content-Type': 'application/json'
              }
            });
            
            if (!response.ok) throw new Error('Failed to fetch data');
            
            const data = await response.json();
            storeData = data.store;
            apiKeys = data.apiKeys || [];
            
            render();
          } catch (error) {
            document.getElementById('app').innerHTML = \`
              <div class="error">
                <strong>Error:</strong> \${error.message}
              </div>
            \`;
          }
        }

        async function createApiKey() {
          const name = prompt('Enter a name for this API key:');
          if (!name) return;
          
          try {
            const response = await fetch(\`\${API_URL}/api/admin/api-keys\`, {
              method: 'POST',
              headers: {
                'Authorization': \`Bearer \${TOKEN}\`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ name })
            });
            
            if (!response.ok) throw new Error('Failed to create API key');
            
            const data = await response.json();
            
            alert(\`API Key Created!\\n\\nAPI Key: \${data.api_key}\\nAPI Secret: \${data.api_secret}\\n\\nSave these credentials securely. You won't be able to see the secret again!\`);
            
            await fetchData();
          } catch (error) {
            alert('Error creating API key: ' + error.message);
          }
        }

        async function deleteApiKey(keyId) {
          if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
            return;
          }
          
          try {
            const response = await fetch(\`\${API_URL}/api/admin/api-keys/\${keyId}\`, {
              method: 'DELETE',
              headers: {
                'Authorization': \`Bearer \${TOKEN}\`
              }
            });
            
            if (!response.ok) throw new Error('Failed to delete API key');
            
            await fetchData();
          } catch (error) {
            alert('Error deleting API key: ' + error.message);
          }
        }

        function render() {
          const activeKeys = apiKeys.filter(k => k.is_active).length;
          const totalKeys = apiKeys.length;
          
          document.getElementById('app').innerHTML = \`
            <div class="stats">
              <div class="stat-card">
                <div class="stat-label">Store</div>
                <div class="stat-value" style="font-size: 18px;">\${SHOP}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Active API Keys</div>
                <div class="stat-value">\${activeKeys}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total API Keys</div>
                <div class="stat-value">\${totalKeys}</div>
              </div>
            </div>

            <div class="card">
              <h2>📋 API Keys</h2>
              <p>Create API keys to allow your custom inventory portal to access Shopify data in real-time.</p>
              <button class="button" onclick="createApiKey()">+ Create New API Key</button>
              
              <div style="margin-top: 20px;">
                \${apiKeys.length === 0 ? 
                  '<p style="color: #637381;">No API keys created yet. Create one to get started!</p>' :
                  apiKeys.map(key => \`
                    <div class="api-key-item">
                      <h3>\${key.name} <span class="badge \${key.is_active ? 'badge-success' : 'badge-inactive'}">\${key.is_active ? 'Active' : 'Inactive'}</span></h3>
                      <p><strong>Created:</strong> \${new Date(key.created_at).toLocaleString()}</p>
                      <p><strong>Last Used:</strong> \${key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}</p>
                      <p><strong>Scopes:</strong> \${key.scopes}</p>
                      <button class="button button-danger" onclick="deleteApiKey(\${key.id})">Delete</button>
                    </div>
                  \`).join('')
                }
              </div>
            </div>

            <div class="card">
              <h2>🔌 API Endpoints</h2>
              <p>Use these endpoints in your custom inventory portal with your API key and secret.</p>
              
              <div class="code" style="margin: 15px 0;">
                Base URL: <strong>\${API_URL}/api</strong>
              </div>

              <div class="endpoints">
                <div class="endpoint">
                  <span class="endpoint-method method-get">GET</span>
                  <code>/orders</code> - Get all orders
                </div>
                <div class="endpoint">
                  <span class="endpoint-method method-get">GET</span>
                  <code>/orders/:id</code> - Get specific order
                </div>
                <div class="endpoint">
                  <span class="endpoint-method method-put">PUT</span>
                  <code>/orders/:id</code> - Update order (tags, status)
                </div>
                <div class="endpoint">
                  <span class="endpoint-method method-get">GET</span>
                  <code>/customers</code> - Get all customers
                </div>
                <div class="endpoint">
                  <span class="endpoint-method method-get">GET</span>
                  <code>/products</code> - Get all products
                </div>
                <div class="endpoint">
                  <span class="endpoint-method method-put">PUT</span>
                  <code>/products/:id</code> - Update product
                </div>
                <div class="endpoint">
                  <span class="endpoint-method method-get">GET</span>
                  <code>/inventory</code> - Get inventory levels
                </div>
                <div class="endpoint">
                  <span class="endpoint-method method-post">POST</span>
                  <code>/inventory/sync</code> - Sync inventory to Shopify
                </div>
              </div>

              <p style="margin-top: 15px; color: #637381;"><strong>Authentication:</strong> Include headers <code>X-API-Key</code> and <code>X-API-Secret</code> in all requests.</p>
            </div>
          \`;
        }

        // Initialize
        fetchData();
      </script>
    </body>
    </html>
  `);
});

/**
 * GET /api/admin/store - Get store data and API keys
 */
router.get('/api/admin/store', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, config.security.jwtSecret);
    const store = await storeService.getStoreById(decoded.storeId);
    
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    const apiKeys = await apiKeyService.getApiKeysByStore(store.id);
    
    res.json({
      store: {
        shop_domain: store.shop_domain,
        scopes: store.scopes,
        installed_at: store.installed_at
      },
      apiKeys
    });
  } catch (error) {
    console.error('Error fetching store data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

/**
 * POST /api/admin/api-keys - Create new API key
 */
router.post('/api/admin/api-keys', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { name } = req.body;
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  try {
    const decoded = jwt.verify(token, config.security.jwtSecret);
    const store = await storeService.getStoreById(decoded.storeId);
    
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    const apiKey = await apiKeyService.createApiKey(store.id, name, store.scopes);
    
    res.json(apiKey);
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * DELETE /api/admin/api-keys/:id - Delete API key
 */
router.delete('/api/admin/api-keys/:id', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { id } = req.params;
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, config.security.jwtSecret);
    const deleted = await apiKeyService.deleteApiKey(parseInt(id), decoded.storeId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

module.exports = router;
