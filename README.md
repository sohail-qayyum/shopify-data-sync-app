# 🔄 Shopify Data Sync App

A professional, multi-tenant Shopify app that enables real-time synchronization of orders, customers, inventory, and products with your custom inventory portal. Built with Node.js, PostgreSQL, and Shopify's best practices.

## 🌟 Features

- ✅ **Multi-tenant Support** - Install on multiple Shopify stores
- 🔐 **Secure OAuth Authentication** - Industry-standard Shopify OAuth flow
- 🔑 **API Key Management** - Generate and manage API keys from Shopify admin
- 📡 **Real-time Webhooks** - Instant notifications for data changes
- 📊 **Comprehensive Data Access** - Orders, customers, products, inventory, fulfillments
- 📈 **Activity Logging** - Track all sync operations
- 🚀 **Production Ready** - Rate limiting, encryption, error handling
- 🎨 **Admin UI** - Beautiful embedded admin panel in Shopify

## 📋 Prerequisites

- Node.js >= 16.0.0
- PostgreSQL database
- Shopify Partner account
- VPS server with domain/subdomain

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/sohail-qayyum/shopify-data-sync-app.git
cd shopify-data-sync-app
npm install
```

### 2. Create Shopify App

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Create a new app
3. Configure app URLs:
   - **App URL**: `https://your-subdomain.yourdomain.com/admin`
   - **Allowed redirection URL(s)**: `https://your-subdomain.yourdomain.com/auth/callback`
4. Copy your API credentials

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Shopify App Configuration
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_SCOPES=read_orders,write_orders,read_customers,write_customers,read_products,write_products,read_inventory,write_inventory,read_fulfillments,write_fulfillments,read_locations,read_product_listings

# App Configuration
APP_URL=https://your-subdomain.yourdomain.com
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shopify_sync_app
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Security (Generate random strings)
JWT_SECRET=your_jwt_secret_key_here
API_KEY_ENCRYPTION_SECRET=your_encryption_secret_here
SESSION_SECRET=your_session_secret_here
```

### 4. Setup Database

```bash
# Create database
createdb shopify_sync_app

# Run migrations
npm run migrate
```

### 5. Start the App

```bash
# Development
npm run dev

# Production
npm start
```

## 🔧 Installation on Shopify Store

1. Visit: `https://your-subdomain.yourdomain.com/auth?shop=your-store.myshopify.com`
2. Click "Install App"
3. Approve permissions
4. Access admin panel at: Shopify Admin → Apps → Shopify Data Sync App

## 🔑 API Key Management

### Generate API Key

1. Open your Shopify admin
2. Navigate to Apps → Shopify Data Sync App
3. Click "Create New API Key"
4. Enter a name (e.g., "Production Portal")
5. **Save the credentials immediately** - you won't see the secret again!

### API Authentication

All API requests require headers:

```http
X-API-Key: sk_your_api_key_here
X-API-Secret: your_api_secret_here
```

## 📡 API Endpoints

Base URL: `https://your-subdomain.yourdomain.com/api`

### Orders

```http
GET    /orders              # Get all orders
GET    /orders/:id          # Get specific order
PUT    /orders/:id          # Update order (tags, status)
```

**Example - Update Order Tags:**
```bash
curl -X PUT https://your-app.com/api/orders/123456789 \
  -H "X-API-Key: sk_your_key" \
  -H "X-API-Secret: your_secret" \
  -H "Content-Type: application/json" \
  -d '{"tags": "processed, shipped"}'
```

### Customers

```http
GET    /customers           # Get all customers
GET    /customers/:id       # Get specific customer
PUT    /customers/:id       # Update customer
```

### Products

```http
GET    /products            # Get all products
GET    /products/:id        # Get specific product
PUT    /products/:id        # Update product
POST   /products            # Create product
```

### Inventory

```http
GET    /inventory           # Get inventory levels
POST   /inventory/sync      # Sync inventory to Shopify
```

**Example - Sync Inventory:**
```bash
curl -X POST https://your-app.com/api/inventory/sync \
  -H "X-API-Key: sk_your_key" \
  -H "X-API-Secret: your_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "inventory_item_id": 12345,
    "location_id": 67890,
    "available": 100
  }'
```

### Locations

```http
GET    /locations           # Get all store locations
```

### Fulfillments

```http
GET    /orders/:orderId/fulfillments      # Get order fulfillments
POST   /orders/:orderId/fulfillments      # Create fulfillment
```

### Activity Logs

```http
GET    /logs                # Get sync logs
GET    /stats               # Get activity statistics
```

## 🎯 Real-time Webhooks

The app automatically registers webhooks for:

- `orders/create` - New order created
- `orders/updated` - Order updated
- `orders/cancelled` - Order cancelled
- `customers/create` - New customer
- `customers/update` - Customer updated
- `products/create` - New product
- `products/update` - Product updated
- `products/delete` - Product deleted
- `inventory_levels/update` - Inventory changed
- `fulfillments/create` - Fulfillment created
- `fulfillments/update` - Fulfillment updated

Webhooks are sent to: `https://your-app.com/webhooks/{topic}`

### Custom Webhook Processing

To add custom logic for webhooks, edit `src/routes/webhooks.js`:

```javascript
router.post('/orders-create', async (req, res) => {
  const order = req.body;
  
  // Your custom logic here:
  // - Send notification to your portal
  // - Update local database
  // - Trigger other processes
  
  res.status(200).send('OK');
});
```

## 🔐 Security Features

- ✅ HMAC signature verification for OAuth and webhooks
- ✅ API key encryption at rest
- ✅ Rate limiting (100 requests per 15 minutes per API key)
- ✅ Secure password hashing
- ✅ JWT-based session management
- ✅ CORS protection
- ✅ Helmet security headers

## 📊 Database Schema

### Stores
Stores Shopify store information and access tokens.

### API Keys
Manages generated API keys for external access.

### Webhooks
Tracks registered webhooks for each store.

### Sync Logs
Logs all synchronization activities for auditing.

## 🛠️ Development

### Project Structure

```
shopify-data-sync-app/
├── src/
│   ├── config/              # Configuration files
│   ├── database/            # Database connection and migrations
│   ├── middleware/          # Express middleware
│   ├── routes/              # API routes
│   ├── services/            # Business logic services
│   ├── utils/               # Utility functions
│   └── server.js            # Main server file
├── package.json
├── .env.example
└── README.md
```

### Running Migrations

```bash
npm run migrate
```

### Accessing PostgreSQL

```bash
psql -U your_db_user -d shopify_sync_app
```

### View Logs

```bash
# Real-time logs
tail -f logs/app.log

# PM2 logs (if using PM2)
pm2 logs shopify-app
```

## 🚀 Deployment

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start src/server.js --name shopify-app

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

### Using systemd

Create `/etc/systemd/system/shopify-app.service`:

```ini
[Unit]
Description=Shopify Data Sync App
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/shopify-data-sync-app
ExecStart=/usr/bin/node src/server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable shopify-app
sudo systemctl start shopify-app
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-subdomain.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable SSL with Let's Encrypt:

```bash
sudo certbot --nginx -d your-subdomain.yourdomain.com
```

## 📝 Integration with Your Custom Portal

### Example: Fetch Orders

```javascript
const axios = require('axios');

const API_URL = 'https://your-app.com/api';
const API_KEY = 'sk_your_key';
const API_SECRET = 'your_secret';

async function getOrders() {
  try {
    const response = await axios.get(`${API_URL}/orders`, {
      headers: {
        'X-API-Key': API_KEY,
        'X-API-Secret': API_SECRET
      },
      params: {
        status: 'any',
        limit: 50
      }
    });
    
    console.log('Orders:', response.data.orders);
    return response.data.orders;
  } catch (error) {
    console.error('Error fetching orders:', error.response?.data || error.message);
  }
}
```

### Example: Update Order Tags

```javascript
async function updateOrderTags(orderId, tags) {
  try {
    const response = await axios.put(
      `${API_URL}/orders/${orderId}`,
      { tags },
      {
        headers: {
          'X-API-Key': API_KEY,
          'X-API-Secret': API_SECRET
        }
      }
    );
    
    console.log('Order updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating order:', error.response?.data || error.message);
  }
}
```

### Example: Sync Inventory

```javascript
async function syncInventory(inventoryItemId, locationId, quantity) {
  try {
    const response = await axios.post(
      `${API_URL}/inventory/sync`,
      {
        inventory_item_id: inventoryItemId,
        location_id: locationId,
        available: quantity
      },
      {
        headers: {
          'X-API-Key': API_KEY,
          'X-API-Secret': API_SECRET
        }
      }
    );
    
    console.log('Inventory synced:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error syncing inventory:', error.response?.data || error.message);
  }
}
```

## 🐛 Troubleshooting

### Common Issues

**1. "Invalid HMAC signature" during OAuth**
- Verify your `SHOPIFY_API_SECRET` is correct
- Check that your app URL matches exactly in Shopify Partner Dashboard

**2. "Store not found" errors**
- Run database migrations: `npm run migrate`
- Check database connection settings in `.env`

**3. Webhooks not receiving data**
- Verify your `APP_URL` is publicly accessible
- Check webhook registration in Shopify admin
- Review webhook logs in database

**4. API authentication failures**
- Ensure both `X-API-Key` and `X-API-Secret` headers are included
- Verify the API key is active in admin panel

### Enable Debug Logging

```bash
NODE_ENV=development npm run dev
```

## 📄 License

MIT License - feel free to use this app for your projects!

## 👨‍💻 Author

**Sohail Qayyum**
- GitHub: [@sohail-qayyum](https://github.com/sohail-qayyum)

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Shopify's [API documentation](https://shopify.dev/docs/api)
3. Open an issue on GitHub

---

Made with ❤️ for seamless Shopify integration
