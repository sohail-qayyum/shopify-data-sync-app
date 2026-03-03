const { ShopifyAPI } = require('./src/utils/shopify');
const axios = require('axios');

// Mock axios
jest.mock('axios');

async function testInventoryUpdate() {
    console.log('Testing Inventory Update with Mocked GraphQL...');

    const shopify = new ShopifyAPI('test-shop.myshopify.com', 'test-token');

    // Mock GraphQL response
    const mockResponse = {
        data: {
            data: {
                inventorySetOnHandQuantities: {
                    inventoryLevels: [
                        {
                            id: 'gid://shopify/InventoryLevel/123?location_id=456',
                            quantities: [{ name: 'on_hand', quantity: 10 }],
                            item: { id: 'gid://shopify/InventoryItem/789' },
                            location: { id: 'gid://shopify/Location/456' }
                        }
                    ],
                    userErrors: []
                }
            }
        }
    };

    axios.mockResolvedValue(mockResponse);

    try {
        const result = await shopify.updateInventoryLevel('789', '456', 10);
        console.log('Result:', JSON.stringify(result, null, 2));

        // Check if axios was called with the correct GraphQL mutation
        const lastCall = axios.mock.calls[0][0];
        console.log('Mutation check:', lastCall.data.query.includes('inventorySetOnHandQuantities'));
        console.log('Variables check:', lastCall.data.variables.input.setQuantities[0].quantity === 10);

        if (result.inventory_level.available === 10 && result.inventory_level.inventory_item_id === '789') {
            console.log('✅ Test Passed: Result structure and data are correct.');
        } else {
            console.log('❌ Test Failed: Unexpected result structure or data.');
        }
    } catch (error) {
        console.error('❌ Test Error:', error.message);
    }
}

// Since I can't actually run jest easily here, I'll just write a standalone script that manually mocks axios for a quick check.
// I'll rewrite this to be a simple node script.
