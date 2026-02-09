const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const storeService = require('../services/storeService');
const apiKeyService = require('../services/apiKeyService');
const webhookService = require('../services/webhookService');
const syncLogService = require('../services/syncLogService');
const config = require('../config');
const axios = require('axios');
const nodemailer = require('nodemailer');

// Add CORS headers for admin API routes
router.use('/api/admin/*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});


/**
 * GET /admin - Serve admin UI (embedded in Shopify)
 */
router.get('/admin', (req, res) => {
  const { shop, token } = req.query;

  if (!shop) {
    return res.status(400).send('Missing shop parameter. Please install the app first.');
  }

  // If no token or invalid token, redirect to OAuth
  if (!token || token === 'undefined' || token === 'null') {
    console.log('No valid token found, redirecting to OAuth for shop:', shop);
    return res.redirect(`/auth?shop=${shop}`);
  }

  // Set headers to allow embedding
  res.setHeader('Content-Security-Policy', "frame-ancestors https://*.myshopify.com https://admin.shopify.com");
  res.removeHeader('X-Frame-Options');

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
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background: #f6f6f7; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #5c6ac4 0%, #4a5ab3 100%); color: white; padding: 30px 20px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .header p { margin: 5px 0 0 0; opacity: 0.9; }
        .card { background: white; border: 1px solid #dfe3e8; border-radius: 8px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .card h2 { margin-top: 0; font-size: 20px; color: #212b36; font-weight: 600; margin-bottom: 16px; }
        .card h3 { font-size: 16px; color: #212b36; font-weight: 600; margin: 20px 0 12px 0; }
        
        /* Buttons */
        .button { background: #5c6ac4; color: white; border: none; padding: 12px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; display: inline-block; text-decoration: none; }
        .button:hover { background: #4a5ab3; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .button:active { transform: translateY(0); }
        .button-secondary { background: #f4f6f8; color: #212b36; border: 1px solid #c4cdd5; }
        .button-secondary:hover { background: #e4e5e7; }
        .button-danger { background: #de3618; }
        .button-danger:hover { background: #c5280c; }
        .button-small { padding: 6px 12px; font-size: 13px; }
        .button:disabled { opacity: 0.5; cursor: not-allowed; }
        
        /* Form Elements */
        .input { width: 100%; padding: 10px 12px; border: 1px solid #c4cdd5; border-radius: 4px; font-size: 14px; margin-bottom: 12px; transition: border-color 0.2s; }
        .input:focus { outline: none; border-color: #5c6ac4; box-shadow: 0 0 0 1px #5c6ac4; }
        .textarea { width: 100%; padding: 10px 12px; border: 1px solid #c4cdd5; border-radius: 4px; font-size: 14px; min-height: 100px; font-family: inherit; resize: vertical; }
        .textarea:focus { outline: none; border-color: #5c6ac4; box-shadow: 0 0 0 1px #5c6ac4; }
        
        /* Scopes */
        .scopes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; margin: 16px 0; }
        .scope-item { display: flex; align-items: center; padding: 10px; background: #f9fafb; border: 1px solid #dfe3e8; border-radius: 4px; transition: all 0.2s; }
        .scope-item:hover { background: #f4f6f8; }
        .scope-item input[type="checkbox"] { margin-right: 10px; width: 18px; height: 18px; cursor: pointer; }
        .scope-item label { cursor: pointer; font-size: 14px; color: #212b36; user-select: none; flex: 1; }
        
        /* API Keys */
        .api-key-item { background: #f9fafb; padding: 20px; margin-bottom: 16px; border-radius: 6px; border: 1px solid #dfe3e8; }
        .api-key-item h3 { margin: 0 0 12px 0; font-size: 18px; display: flex; align-items: center; justify-content: space-between; }
        .api-key-item p { margin: 8px 0; font-size: 14px; color: #637381; }
        
        /* Credentials Display */
        .credential-box { background: white; border: 1px solid #c4cdd5; border-radius: 4px; padding: 16px; margin: 16px 0; }
        .credential-item { margin-bottom: 16px; }
        .credential-item:last-child { margin-bottom: 0; }
        .credential-label { font-size: 12px; font-weight: 600; color: #637381; text-transform: uppercase; margin-bottom: 6px; }
        .credential-value { display: flex; align-items: center; gap: 8px; }
        .credential-text { flex: 1; padding: 10px 12px; background: #f4f6f8; border: 1px solid #dfe3e8; border-radius: 4px; font-family: 'Monaco', 'Menlo', monospace; font-size: 13px; word-break: break-all; color: #212b36; }
        .copy-btn { padding: 8px 16px; background: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; white-space: nowrap; transition: all 0.2s; }
        .copy-btn:hover { background: #4a5ab3; }
        .copy-btn.copied { background: #50b83c; }
        
        /* Modal */
        .modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; }
        .modal-overlay.active { display: flex; }
        .modal { background: white; border-radius: 8px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #dfe3e8; }
        .modal-header h2 { margin: 0; font-size: 20px; }
        .modal-body { padding: 24px; }
        .modal-footer { padding: 16px 24px; border-top: 1px solid #dfe3e8; display: flex; gap: 12px; justify-content: flex-end; }
        
        /* Badges */
        .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-success { background: #aee9d1; color: #108043; }
        .badge-inactive { background: #e4e5e7; color: #637381; }
        .badge-warning { background: #ffd79d; color: #7f2d00; }
        
        /* Stats */
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: white; border: 1px solid #dfe3e8; border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .stat-value { font-size: 36px; font-weight: 700; color: #5c6ac4; margin: 10px 0; }
        .stat-label { color: #637381; font-size: 14px; font-weight: 500; }
        
        /* Endpoints */
        .endpoints { background: #f9fafb; padding: 16px; border-radius: 4px; margin-top: 16px; }
        .endpoint { margin: 12px 0; padding: 10px; background: white; border-radius: 4px; }
        .endpoint-method { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-right: 12px; min-width: 50px; text-align: center; }
        .method-get { background: #b4e7ce; color: #0c5132; }
        .method-post { background: #ffd79d; color: #7f2d00; }
        .method-put { background: #b4dafe; color: #004085; }
        
        /* Utilities */
        .loading { text-align: center; padding: 60px 20px; color: #637381; }
        .error { background: #fbeae5; border: 1px solid #de3618; color: #c5280c; padding: 16px; border-radius: 4px; margin-bottom: 20px; }
        .success { background: #e3f1df; border: 1px solid #50b83c; color: #108043; padding: 16px; border-radius: 4px; margin-bottom: 20px; }
        .text-muted { color: #637381; font-size: 14px; }
        .mt-2 { margin-top: 16px; }
        .mb-2 { margin-bottom: 16px; }
        
        /* Support Section */
        .support-box { background: linear-gradient(135deg, #f4f6f8 0%, #e4e5e7 100%); padding: 20px; border-radius: 8px; border: 1px solid #c4cdd5; }
        .support-icon { font-size: 32px; margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔄 Shopify Data Sync App</h1>
        <p>Manage API keys, select scopes, and monitor your sync activity</p>
      </div>
      
      <div class="container">
        <div id="app">
          <div class="loading">
            <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
            <div>Loading your dashboard...</div>
          </div>
        </div>
      </div>

      <!-- Create API Key Modal -->
      <div id="createKeyModal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2>Create New API Key</h2>
          </div>
          <div class="modal-body">
            <label for="keyName" style="display: block; font-weight: 600; margin-bottom: 8px;">API Key Name *</label>
            <input type="text" id="keyName" class="input" placeholder="e.g., Production Portal, Dev Environment" />
            
            <h3>Select Scopes *</h3>
            <p class="text-muted mb-2">Choose which permissions this API key will have. Select only what you need.</p>
            <div id="scopesContainer" class="scopes-grid"></div>
            
            <div id="scopeError" style="display: none; color: #de3618; font-size: 14px; margin-top: 12px;">
              ⚠️ Please select at least one scope
            </div>
          </div>
          <div class="modal-footer">
            <button class="button button-secondary" onclick="closeCreateModal()">Cancel</button>
            <button class="button" onclick="submitCreateKey()">Create API Key</button>
          </div>
        </div>
      </div>

      <!-- Display Credentials Modal -->
      <div id="credentialsModal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2>🎉 API Key Created Successfully!</h2>
          </div>
          <div class="modal-body">
            <div class="success">
              <strong>Important:</strong> Save these credentials now! You won't be able to see the API Secret again.
            </div>
            
            <div class="credential-box">
              <div class="credential-item">
                <div class="credential-label">API Key</div>
                <div class="credential-value">
                  <div class="credential-text" id="displayApiKey"></div>
                  <button class="copy-btn" onclick="copyToClipboard('displayApiKey', this)">Copy</button>
                </div>
              </div>
              
              <div class="credential-item">
                <div class="credential-label">API Secret</div>
                <div class="credential-value">
                  <div class="credential-text" id="displayApiSecret"></div>
                  <button class="copy-btn" onclick="copyToClipboard('displayApiSecret', this)">Copy</button>
                </div>
              </div>
            </div>
            
            <p class="text-muted mt-2">
              <strong>Next Steps:</strong> Use these credentials in your custom portal by including them as headers in API requests:
              <br><code>X-API-Key: [Your API Key]</code>
              <br><code>X-API-Secret: [Your API Secret]</code>
            </p>
          </div>
          <div class="modal-footer">
            <button class="button" onclick="closeCredentialsModal()">Done</button>
          </div>
        </div>
      </div>

      <!-- Support Modal -->
      <div id="supportModal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2>💬 Contact Support</h2>
          </div>
          <div class="modal-body">
            <label for="supportEmail" style="display: block; font-weight: 600; margin-bottom: 8px;">Your Email</label>
            <input type="email" id="supportEmail" class="input" placeholder="your@email.com" />
            
            <label for="supportSubject" style="display: block; font-weight: 600; margin-bottom: 8px;">Subject</label>
            <input type="text" id="supportSubject" class="input" placeholder="How can we help?" />
            
            <label for="supportMessage" style="display: block; font-weight: 600; margin-bottom: 8px;">Message</label>
            <textarea id="supportMessage" class="textarea" placeholder="Describe your issue or feedback..."></textarea>
            
            <div id="supportSuccess" style="display: none;" class="success mt-2">
              ✅ Thank you! Your message has been sent. We'll get back to you soon.
            </div>
          </div>
          <div class="modal-footer">
            <button class="button button-secondary" onclick="closeSupportModal()">Cancel</button>
            <button class="button" id="submitSupportBtn" onclick="submitSupport()">Send Message</button>
          </div>
        </div>
      </div>

      <script>
        const API_URL = '${config.app.url}';
        const SHOP = '${shop}';
        const TOKEN = '${token}';

        let AVAILABLE_SCOPES = [];

        let storeData = null;
        let apiKeys = [];
        let selectedScopes = [];

        function copyToClipboard(elementId, button) {
          const element = document.getElementById(elementId);
          const text = element.textContent;
          
          navigator.clipboard.writeText(text).then(function() {
            const originalText = button.textContent;
            button.textContent = '✓ Copied!';
            button.classList.add('copied');
            
            setTimeout(function() {
              button.textContent = originalText;
              button.classList.remove('copied');
            }, 2000);
          }).catch(function(err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            button.textContent = '✓ Copied!';
            setTimeout(function() { button.textContent = 'Copy'; }, 2000);
          });
        }

        function openCreateModal() {
          selectedScopes = [];
          document.getElementById('keyName').value = '';
          document.getElementById('scopeError').style.display = 'none';
          
          // Render scopes checkboxes
          const container = document.getElementById('scopesContainer');
          container.innerHTML = AVAILABLE_SCOPES.map(function(scope) {
            return '<div class="scope-item"><input type="checkbox" id="scope_' + scope.value + '" value="' + scope.value + '" onchange="toggleScope(this)"><label for="scope_' + scope.value + '"><strong>' + scope.label + '</strong><br><small style="color: #637381;">' + scope.description + '</small></label></div>';
          }).join('');
          
          document.getElementById('createKeyModal').classList.add('active');
        }

        function closeCreateModal() {
          document.getElementById('createKeyModal').classList.remove('active');
        }

        function toggleScope(checkbox) {
          if (checkbox.checked) {
            if (!selectedScopes.includes(checkbox.value)) {
              selectedScopes.push(checkbox.value);
            }
          } else {
            selectedScopes = selectedScopes.filter(function(s) { return s !== checkbox.value; });
          }
          document.getElementById('scopeError').style.display = 'none';
        }

        async function submitCreateKey() {
          const name = document.getElementById('keyName').value.trim();
          
          if (!name) {
            alert('Please enter a name for the API key');
            return;
          }
          
          if (selectedScopes.length === 0) {
            document.getElementById('scopeError').style.display = 'block';
            return;
          }
          
          try {
            const response = await fetch(API_URL + '/api/admin/api-keys', {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ' + TOKEN,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                name: name,
                scopes: selectedScopes.join(',')
              })
            });
            
            if (!response.ok) throw new Error('Failed to create API key');
            
            const data = await response.json();
            
            // Show credentials modal
            document.getElementById('displayApiKey').textContent = data.api_key;
            document.getElementById('displayApiSecret').textContent = data.api_secret;
            closeCreateModal();
            document.getElementById('credentialsModal').classList.add('active');
            
            await fetchData();
          } catch (error) {
            alert('Error creating API key: ' + error.message);
          }
        }

        function closeCredentialsModal() {
          document.getElementById('credentialsModal').classList.remove('active');
        }

        function openSupportModal() {
          document.getElementById('supportEmail').value = '';
          document.getElementById('supportSubject').value = '';
          document.getElementById('supportMessage').value = '';
          document.getElementById('supportSuccess').style.display = 'none';
          document.getElementById('supportModal').classList.add('active');
        }

        function closeSupportModal() {
          document.getElementById('supportModal').classList.remove('active');
        }

        async function submitSupport() {
          const email = document.getElementById('supportEmail').value.trim();
          const subject = document.getElementById('supportSubject').value.trim();
          const message = document.getElementById('supportMessage').value.trim();
          
          if (!email || !subject || !message) {
            alert('Please fill in all fields');
            return;
          }
          
          const submitBtn = document.getElementById('submitSupportBtn');
          if (submitBtn) submitBtn.disabled = true;

          try {
            const response = await fetch(API_URL + '/api/admin/support', {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ' + TOKEN,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ email, subject, message })
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to send support request');
            }
            
            // Show success message
            document.getElementById('supportSuccess').style.display = 'block';
            document.getElementById('supportEmail').value = '';
            document.getElementById('supportSubject').value = '';
            document.getElementById('supportMessage').value = '';
            
            setTimeout(function() {
              closeSupportModal();
            }, 3000);
          } catch (error) {
            alert('Error sending support request: ' + error.message);
          } finally {
            if (submitBtn) submitBtn.disabled = false;
          }
        }

        async function fetchData() {
          try {
            console.log('Fetching store data...');
            
            if (!TOKEN || TOKEN === 'undefined' || TOKEN === 'null') {
              throw new Error('No authentication token. Please reinstall the app.');
            }
            
            const response = await fetch(API_URL + '/api/admin/store', {
              headers: {
                'Authorization': 'Bearer ' + TOKEN,
                'Content-Type': 'application/json'
              }
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
              const errorData = await response.json().catch(function() { return { error: 'Unknown error' }; });
              
              if (response.status === 401) {
                throw new Error('Authentication expired. Please reinstall the app.');
              }
              
              throw new Error(errorData.error || 'Failed to fetch data');
            }
            
            const data = await response.json();
            
            storeData = data.store; if(typeof storeData.scopes === \"string\") storeData.scopes = storeData.scopes.split(\",\").map(function(s){return s.trim()});
            apiKeys = data.apiKeys || [];
            
            // Dynamically generate AVAILABLE_SCOPES from the store's installed scopes
            AVAILABLE_SCOPES = (Array.isArray(storeData.scopes) ? storeData.scopes : (storeData.scopes ? storeData.scopes.split(',').map(function(s) { return s.trim(); }) : [])).map(function(s) {
              const label = s.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
              let description = 'Access to ' + label;
              if (s.startsWith('read_')) description = 'View ' + label.replace('Read ', '') + ' data';
              if (s.startsWith('write_')) description = 'Manage ' + label.replace('Write ', '');
              return { value: s, label: label, description: description };
            });

            render();
          } catch (error) {
            console.error('Fetch error:', error);
            document.getElementById('app').innerHTML = '<div class="error"><strong>Error:</strong> ' + error.message + '<br><br><a href="' + API_URL + '/auth?shop=' + SHOP + '" class="button">Reinstall App</a></div>';
          }
        }

        async function deleteApiKey(keyId) {
          if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
            return;
          }
          
          try {
            const response = await fetch(API_URL + '/api/admin/api-keys/' + keyId, {
              method: 'DELETE',
              headers: {
                'Authorization': 'Bearer ' + TOKEN
              }
            });
            
            if (!response.ok) throw new Error('Failed to delete API key');
            
            await fetchData();
          } catch (error) {
            alert('Error deleting API key: ' + error.message);
          }
        }

        function render() {
          const activeKeys = apiKeys.filter(function(k) { return k.is_active; }).length;
          const totalKeys = apiKeys.length;
          
          let apiKeysHtml = '';
          if (apiKeys.length === 0) {
            apiKeysHtml = '<div style="text-align: center; padding: 40px; color: #637381;"><div style="font-size: 48px; margin-bottom: 16px;">🔑</div><p>No API keys created yet.</p><p>Create your first API key to start syncing data with your custom portal.</p></div>';
          } else {
            apiKeysHtml = apiKeys.map(function(key) {
              return '<div class="api-key-item"><h3><span>' + key.name + '</span> <span class="badge ' + (key.is_active ? 'badge-success' : 'badge-inactive') + '">' + (key.is_active ? 'Active' : 'Inactive') + '</span></h3><p><strong>Created:</strong> ' + new Date(key.created_at).toLocaleString() + '</p><p><strong>Last Used:</strong> ' + (key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never') + '</p><p><strong>Scopes:</strong> ' + key.scopes + '</p><button class="button button-danger button-small" onclick="deleteApiKey(' + key.id + ')">Delete Key</button></div>';
            }).join('');
          }
          
          document.getElementById('app').innerHTML = '<div class="stats"><div class="stat-card"><div class="stat-label">Connected Store</div><div class="stat-value" style="font-size: 18px;">' + SHOP + '</div></div><div class="stat-card"><div class="stat-label">Active Keys</div><div class="stat-value">' + activeKeys + '</div></div><div class="stat-card"><div class="stat-label">Total Keys</div><div class="stat-value">' + totalKeys + '</div></div></div>' +
            '<div class="card"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;"><h2 style="margin: 0;">📋 API Keys</h2><button class="button" onclick="openCreateModal()">+ Create New API Key</button></div><p class="text-muted">API keys allow your custom inventory portal to securely access Shopify data in real-time.</p><div style="margin-top: 24px;">' + apiKeysHtml + '</div></div>' +
            '<div class="card"><h2>🔌 Available API Endpoints</h2><p class="text-muted">These endpoints are automatically adjusted based on your store permissions.</p>' +
            '<div class="credential-box" style="margin: 16px 0;"><div class="credential-label">Base URL</div><div class="credential-text">' + API_URL + '/api/v1</div></div>' +
            '<div class="endpoints">' +
              AVAILABLE_SCOPES.filter(function(s) { return storeData.scopes.includes(s.value); }).map(function(s) {
                const resource = s.value.replace('read_', '').replace('write_', '');
                let queryParam = '';
                if (resource === 'fulfillments') queryParam = '?order_id=...';
                return '<div class="endpoint"><span class="endpoint-method method-get">GET</span><code>/' + resource + queryParam + '</code> — ' + s.description + '</div>';
              }).join('') +
              '<div class="endpoint"><span class="endpoint-method method-get">GET</span><code>/resources</code> — Discover all available endpoints</div>' +
            '</div>' +
            '<p class="text-muted mt-2"><strong>Authentication:</strong> Include <code>X-API-Key</code> and <code>X-API-Secret</code> headers in all requests.</p></div>' +
            '<div class="card"><div class="support-box"><div class="support-icon">💬</div><h2 style="margin-top: 0;">Need Help?</h2><p class="text-muted">Have questions, feedback, or issues? Our support team is here to help!</p><button class="button" onclick="openSupportModal()" style="margin-top: 12px;">Contact Support</button></div></div>';
        }

        // Close modals when clicking overlay
        document.addEventListener('click', function(e) {
          if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('active');
          }
        });

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
    console.error('No authorization token provided');
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.security.jwtSecret);
    console.log('Token decoded successfully:', { shop: decoded.shop, storeId: decoded.storeId });

    const store = await storeService.getStoreById(decoded.storeId);

    if (!store) {
      console.error('Store not found for ID:', decoded.storeId);
      return res.status(404).json({ error: 'Store not found' });
    }

    const apiKeys = await apiKeyService.getApiKeysByStore(store.id);

    console.log('Store data fetched successfully:', { shop: store.shop_domain, apiKeysCount: apiKeys.length });

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

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
});

/**
 * POST /api/admin/api-keys - Create new API key
 */
router.post('/api/admin/api-keys', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { name, scopes } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!scopes) {
    return res.status(400).json({ error: 'Scopes are required' });
  }

  try {
    const decoded = jwt.verify(token, config.security.jwtSecret);
    const store = await storeService.getStoreById(decoded.storeId);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Use provided scopes or default to store scopes
    const apiKeyScopes = scopes || store.scopes;
    const apiKey = await apiKeyService.createApiKey(store.id, name, apiKeyScopes);

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

/**
 * POST /api/admin/support - Send support request to Slack
 */
router.post('/api/admin/support', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { email, subject, message } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, config.security.jwtSecret);
    const store = await storeService.getStoreById(decoded.storeId);

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const webhookUrl = config.app.supportWebhookUrl;
    const supportEmail = config.app.supportEmail;

    if (!webhookUrl && !supportEmail) {
      console.warn('⚠️ No support notification (Slack/Email) configured. Request logged only.');
      console.log('Support request:', { shop: store.shop_domain, email, subject, message });
      return res.json({ success: true, message: 'Request logged (Notifications not configured)' });
    }

    // 1. Send to Slack if configured
    if (webhookUrl) {
      const slackMessage = {
        text: `🆕 *New Support Request from ${store.shop_domain}*`,
        attachments: [
          {
            color: "#36a64f",
            fields: [
              { title: "Store", value: store.shop_domain, short: true },
              { title: "Contact Email", value: email, short: true },
              { title: "Subject", value: subject, short: false },
              { title: "Message", value: message, short: false }
            ],
            footer: "Shopify Data Sync App",
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };
      await axios.post(webhookUrl, slackMessage).catch(err => console.error('Slack error:', err.message));
    }

    // 2. Send to Email if configured
    if (supportEmail && config.app.smtp.host) {
      const transporter = nodemailer.createTransport({
        host: config.app.smtp.host,
        port: config.app.smtp.port,
        secure: config.app.smtp.port == 465,
        auth: {
          user: config.app.smtp.user,
          pass: config.app.smtp.pass
        }
      });

      await transporter.sendMail({
        from: `"${store.shop_domain} Support" <${config.app.smtp.user}>`,
        to: supportEmail,
        replyTo: email,
        subject: `[Support Request] ${subject}`,
        text: `Store: ${store.shop_domain}\nFrom: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
        html: `
          <h3>New Support Request</h3>
          <p><strong>Store:</strong> ${store.shop_domain}</p>
          <p><strong>From:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr/>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      }).catch(err => console.error('Email error:', err.message));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending support request:', error);
    res.status(500).json({ error: 'Failed to send support request' });
  }
});

module.exports = router;
