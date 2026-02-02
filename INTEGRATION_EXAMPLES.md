# API Integration Examples

This document provides practical examples for integrating the Shopify Data Sync App with your custom inventory portal.

## Setup

```javascript
const axios = require('axios');

// Configuration
const config = {
  apiUrl: 'https://your-subdomain.yourdomain.com/api',
  apiKey: 'sk_your_api_key_here',
  apiSecret: 'your_api_secret_here'
};

// Create axios instance with default headers
const shopifyApi = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'X-API-Key': config.apiKey,
    'X-API-Secret': config.apiSecret,
    'Content-Type': 'application/json'
  }
});
```

## Orders Management

### Fetch Recent Orders

```javascript
async function fetchRecentOrders(limit = 50) {
  try {
    const response = await shopifyApi.get('/orders', {
      params: {
        status: 'any',
        limit: limit,
        order: 'created_at desc'
      }
    });
    
    return response.data.orders;
  } catch (error) {
    console.error('Error fetching orders:', error.response?.data);
    throw error;
  }
}

// Usage
const orders = await fetchRecentOrders(100);
console.log(`Fetched ${orders.length} orders`);
```

### Get Order by ID

```javascript
async function getOrder(orderId) {
  try {
    const response = await shopifyApi.get(`/orders/${orderId}`);
    return response.data.order;
  } catch (error) {
    console.error(`Error fetching order ${orderId}:`, error.response?.data);
    throw error;
  }
}
```

### Update Order Tags

```javascript
async function updateOrderTags(orderId, tags) {
  try {
    const response = await shopifyApi.put(`/orders/${orderId}`, {
      tags: tags // Can be string "tag1, tag2" or array
    });
    
    console.log(`Updated order ${orderId} tags to: ${tags}`);
    return response.data.order;
  } catch (error) {
    console.error('Error updating order tags:', error.response?.data);
    throw error;
  }
}

// Usage
await updateOrderTags(123456789, 'processed, ready-to-ship');
```

### Update Order Status

```javascript
async function updateOrderStatus(orderId, note, notifyCustomer = false) {
  try {
    const response = await shopifyApi.put(`/orders/${orderId}`, {
      note: note,
      note_attributes: [
        {
          name: 'processed_by',
          value: 'inventory_portal'
        }
      ]
    });
    
    return response.data.order;
  } catch (error) {
    console.error('Error updating order:', error.response?.data);
    throw error;
  }
}
```

### Search Orders by Customer Email

```javascript
async function findOrdersByEmail(email) {
  try {
    // First get all recent orders
    const response = await shopifyApi.get('/orders', {
      params: {
        status: 'any',
        limit: 250
      }
    });
    
    // Filter by email
    const orders = response.data.orders.filter(order => 
      order.customer?.email?.toLowerCase() === email.toLowerCase()
    );
    
    return orders;
  } catch (error) {
    console.error('Error searching orders:', error.response?.data);
    throw error;
  }
}
```

## Customer Management

### Get All Customers

```javascript
async function getAllCustomers() {
  try {
    const response = await shopifyApi.get('/customers', {
      params: {
        limit: 250
      }
    });
    
    return response.data.customers;
  } catch (error) {
    console.error('Error fetching customers:', error.response?.data);
    throw error;
  }
}
```

### Get Customer Details

```javascript
async function getCustomer(customerId) {
  try {
    const response = await shopifyApi.get(`/customers/${customerId}`);
    return response.data.customer;
  } catch (error) {
    console.error(`Error fetching customer ${customerId}:`, error.response?.data);
    throw error;
  }
}
```

### Update Customer Information

```javascript
async function updateCustomer(customerId, updates) {
  try {
    const response = await shopifyApi.put(`/customers/${customerId}`, updates);
    console.log(`Updated customer ${customerId}`);
    return response.data.customer;
  } catch (error) {
    console.error('Error updating customer:', error.response?.data);
    throw error;
  }
}

// Usage
await updateCustomer(987654321, {
  note: 'VIP Customer - Priority Shipping',
  tags: 'vip, priority'
});
```

## Product Management

### Get All Products

```javascript
async function getAllProducts() {
  try {
    const response = await shopifyApi.get('/products', {
      params: {
        limit: 250
      }
    });
    
    return response.data.products;
  } catch (error) {
    console.error('Error fetching products:', error.response?.data);
    throw error;
  }
}
```

### Update Product

```javascript
async function updateProduct(productId, updates) {
  try {
    const response = await shopifyApi.put(`/products/${productId}`, updates);
    console.log(`Updated product ${productId}`);
    return response.data.product;
  } catch (error) {
    console.error('Error updating product:', error.response?.data);
    throw error;
  }
}

// Usage - Update product title and price
await updateProduct(123456, {
  title: 'Updated Product Title',
  variants: [
    {
      id: 789012,
      price: '29.99'
    }
  ]
});
```

### Create New Product

```javascript
async function createProduct(productData) {
  try {
    const response = await shopifyApi.post('/products', productData);
    console.log('Product created:', response.data.product.id);
    return response.data.product;
  } catch (error) {
    console.error('Error creating product:', error.response?.data);
    throw error;
  }
}

// Usage
const newProduct = await createProduct({
  title: 'New Product',
  body_html: '<p>Product description</p>',
  vendor: 'Your Brand',
  product_type: 'Accessories',
  variants: [
    {
      price: '19.99',
      sku: 'NEW-001',
      inventory_quantity: 100
    }
  ]
});
```

## Inventory Management

### Get Inventory Levels

```javascript
async function getInventoryLevels(locationId = null) {
  try {
    const params = {};
    if (locationId) {
      params.location_ids = locationId;
    }
    
    const response = await shopifyApi.get('/inventory', { params });
    return response.data.inventory_levels;
  } catch (error) {
    console.error('Error fetching inventory:', error.response?.data);
    throw error;
  }
}
```

### Sync Inventory from Portal to Shopify

```javascript
async function syncInventoryToShopify(inventoryItemId, locationId, quantity) {
  try {
    const response = await shopifyApi.post('/inventory/sync', {
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available: quantity
    });
    
    console.log(`Synced inventory: Item ${inventoryItemId} = ${quantity} units`);
    return response.data;
  } catch (error) {
    console.error('Error syncing inventory:', error.response?.data);
    throw error;
  }
}

// Usage
await syncInventoryToShopify(12345, 67890, 150);
```

### Bulk Inventory Update

```javascript
async function bulkInventoryUpdate(updates) {
  const results = [];
  
  for (const update of updates) {
    try {
      const result = await syncInventoryToShopify(
        update.inventoryItemId,
        update.locationId,
        update.quantity
      );
      results.push({ success: true, ...result });
    } catch (error) {
      results.push({ 
        success: false, 
        error: error.message,
        ...update 
      });
    }
  }
  
  return results;
}

// Usage
const updates = [
  { inventoryItemId: 123, locationId: 456, quantity: 100 },
  { inventoryItemId: 124, locationId: 456, quantity: 50 },
  { inventoryItemId: 125, locationId: 456, quantity: 200 }
];

const results = await bulkInventoryUpdate(updates);
console.log(`Updated ${results.filter(r => r.success).length} of ${results.length} items`);
```

## Fulfillment Management

### Get Order Fulfillments

```javascript
async function getOrderFulfillments(orderId) {
  try {
    const response = await shopifyApi.get(`/orders/${orderId}/fulfillments`);
    return response.data.fulfillments;
  } catch (error) {
    console.error('Error fetching fulfillments:', error.response?.data);
    throw error;
  }
}
```

### Create Fulfillment

```javascript
async function createFulfillment(orderId, lineItems, trackingNumber = null) {
  try {
    const fulfillmentData = {
      line_items: lineItems,
      notify_customer: true
    };
    
    if (trackingNumber) {
      fulfillmentData.tracking_number = trackingNumber;
      fulfillmentData.tracking_company = 'Other';
    }
    
    const response = await shopifyApi.post(
      `/orders/${orderId}/fulfillments`,
      fulfillmentData
    );
    
    console.log(`Created fulfillment for order ${orderId}`);
    return response.data.fulfillment;
  } catch (error) {
    console.error('Error creating fulfillment:', error.response?.data);
    throw error;
  }
}

// Usage
await createFulfillment(
  123456789,
  [
    { id: 111, quantity: 1 },
    { id: 222, quantity: 2 }
  ],
  'TRACK123456'
);
```

## Location Management

### Get All Locations

```javascript
async function getLocations() {
  try {
    const response = await shopifyApi.get('/locations');
    return response.data.locations;
  } catch (error) {
    console.error('Error fetching locations:', error.response?.data);
    throw error;
  }
}
```

## Activity Monitoring

### Get Recent Sync Logs

```javascript
async function getSyncLogs(limit = 100, offset = 0) {
  try {
    const response = await shopifyApi.get('/logs', {
      params: { limit, offset }
    });
    
    return response.data.logs;
  } catch (error) {
    console.error('Error fetching logs:', error.response?.data);
    throw error;
  }
}
```

### Get Activity Statistics

```javascript
async function getActivityStats(hours = 24) {
  try {
    const response = await shopifyApi.get('/stats', {
      params: { hours }
    });
    
    return response.data.summary;
  } catch (error) {
    console.error('Error fetching stats:', error.response?.data);
    throw error;
  }
}

// Usage
const stats = await getActivityStats(24);
console.log('Last 24 hours activity:', stats);
```

## Complete POS Integration Example

```javascript
class ShopifyPOSIntegration {
  constructor(apiUrl, apiKey, apiSecret) {
    this.api = axios.create({
      baseURL: apiUrl,
      headers: {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
        'Content-Type': 'application/json'
      }
    });
  }

  // Fetch orders for POS display
  async getOrdersForPOS(status = 'any', limit = 50) {
    const response = await this.api.get('/orders', {
      params: { status, limit, order: 'created_at desc' }
    });
    return response.data.orders;
  }

  // Process order from POS
  async processOrder(orderId, processedBy) {
    return await this.api.put(`/orders/${orderId}`, {
      tags: 'pos-processed',
      note_attributes: [
        { name: 'processed_by', value: processedBy },
        { name: 'processed_at', value: new Date().toISOString() }
      ]
    });
  }

  // Update inventory after sale
  async updateInventoryAfterSale(items) {
    const results = [];
    for (const item of items) {
      try {
        const result = await this.api.post('/inventory/sync', {
          inventory_item_id: item.inventoryItemId,
          location_id: item.locationId,
          available: item.newQuantity
        });
        results.push({ success: true, item: item.sku });
      } catch (error) {
        results.push({ success: false, item: item.sku, error: error.message });
      }
    }
    return results;
  }

  // Create fulfillment for order
  async fulfillOrder(orderId, lineItems, trackingNumber) {
    return await this.api.post(`/orders/${orderId}/fulfillments`, {
      line_items: lineItems,
      tracking_number: trackingNumber,
      notify_customer: true
    });
  }
}

// Usage
const pos = new ShopifyPOSIntegration(
  'https://your-app.com/api',
  'sk_your_key',
  'your_secret'
);

// Get orders
const orders = await pos.getOrdersForPOS('open', 20);

// Process order
await pos.processOrder(123456, 'cashier-john');

// Update inventory
await pos.updateInventoryAfterSale([
  { inventoryItemId: 111, locationId: 222, newQuantity: 45, sku: 'PROD-001' },
  { inventoryItemId: 333, locationId: 222, newQuantity: 100, sku: 'PROD-002' }
]);
```

## Error Handling Best Practices

```javascript
async function safeApiCall(apiFunction, ...args) {
  try {
    return await apiFunction(...args);
  } catch (error) {
    if (error.response) {
      // API responded with error
      console.error('API Error:', {
        status: error.response.status,
        message: error.response.data.error,
        details: error.response.data
      });
      
      // Handle specific errors
      if (error.response.status === 401) {
        console.error('Authentication failed - check API credentials');
      } else if (error.response.status === 429) {
        console.error('Rate limit exceeded - slow down requests');
      }
    } else if (error.request) {
      // No response received
      console.error('No response from API:', error.message);
    } else {
      console.error('Request error:', error.message);
    }
    
    throw error;
  }
}

// Usage
const orders = await safeApiCall(fetchRecentOrders, 100);
```

## Rate Limiting Handling

```javascript
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(apiFunction, maxRetries = 3, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiFunction();
    } catch (error) {
      if (error.response?.status === 429 && i < maxRetries - 1) {
        console.log(`Rate limited, retrying in ${delayMs}ms...`);
        await delay(delayMs);
        delayMs *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
}
```

---

## Notes

- All timestamps are in ISO 8601 format
- Rate limit: 100 requests per 15 minutes per API key
- For bulk operations, add delays between requests
- Always handle errors gracefully
- Store API credentials securely (use environment variables)
