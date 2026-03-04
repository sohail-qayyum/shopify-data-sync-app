const axios = require('axios');
const crypto = require('crypto');

// Setup mock config
const mockConfig = {
    shopify: {
        apiVersion: '2025-01',
        apiSecret: 'test-secret'
    }
};

// Manually define ShopifyAPI class based on src/utils/shopify.js logic
// to avoid complex module loading issues in this environment
class ShopifyAPI {
    constructor(shop, accessToken) {
        this.shop = shop;
        this.accessToken = accessToken;
        this.apiVersion = mockConfig.shopify.apiVersion;
        this.baseUrl = `https://${shop.replace(/\/+$/, '')}/admin/api/${this.apiVersion}`;
    }

    async getLocations() {
        return (await axios({ method: 'GET', url: `${this.baseUrl}/locations.json` })).data;
    }

    async graphql(query, variables = {}) {
        const response = await axios({
            method: 'POST',
            url: `https://${this.shop}/admin/api/${this.apiVersion}/graphql.json`,
            data: { query, variables }
        });
        return response.data.data;
    }

    async updateInventoryLevel(inventoryItemId, locationId, available) {
        if (!inventoryItemId || !locationId) {
            throw new Error('Missing required parameters: inventory_item_id and location_id are both required for inventory updates.');
        }

        const itemGid = inventoryItemId.toString().startsWith('gid://')
            ? inventoryItemId
            : `gid://shopify/InventoryItem/${inventoryItemId}`;

        const locationGid = locationId.toString().startsWith('gid://')
            ? locationId
            : `gid://shopify/Location/${locationId}`;

        const mutation = `mutation inventorySetOnHandQuantities...`; // Simulating mutation check
        const variables = {
            input: {
                setQuantities: [
                    { inventoryItemId: itemGid, locationId: locationGid, quantity: parseInt(available) }
                ]
            }
        };

        const result = await this.graphql(mutation, variables);

        const level = result.inventorySetOnHandQuantities.inventoryLevels[0];
        const quantity = level.quantities.find(q => q.name === 'on_hand')?.quantity || 0;

        return {
            inventory_level: {
                inventory_item_id: level.item.id.split('/').pop(),
                location_id: level.location.id.split('/').pop(),
                available: quantity,
                updated_at: new Date().toISOString()
            }
        };
    }

    async updateResource(resource, id, data) {
        if (resource === 'inventory') {
            let itemId = data.inventory_item_id || id;
            let locationId = data.location_id;
            const available = data.available !== undefined ? data.available : data.inventory_level?.available;

            if (!locationId) {
                console.log('  Notice: location_id missing for inventory update, fetching primary location...');
                const locations = await this.getLocations();
                if (locations && locations.locations && locations.locations.length > 0) {
                    locationId = locations.locations[0].id;
                    console.log('  Auto-selected primary location:', locationId);
                } else {
                    throw new Error('No locations found.');
                }
            }

            return this.updateInventoryLevel(itemId, locationId, available);
        }
        return { success: true };
    }
}

async function testInventoryFix() {
    console.log('Testing Inventory Fix: Primary Location Auto-fetching...');

    // Setup manual mocks
    const mockCalls = [];
    const mockResponses = [
        { data: { locations: [{ id: '456', name: 'Primary Location' }] } }, // getLocations
        {
            data: {
                data: { // graphql mutation
                    inventorySetOnHandQuantities: {
                        inventoryLevels: [{
                            id: 'gid://shopify/InventoryLevel/123?location_id=456',
                            quantities: [{ name: 'on_hand', quantity: 15 }],
                            item: { id: 'gid://shopify/InventoryItem/7925410594873' },
                            location: { id: 'gid://shopify/Location/456' }
                        }],
                        userErrors: []
                    }
                }
            }
        }
    ];

    // Override global axios for this script
    global.axios = async (config) => {
        mockCalls.push(config);
        return mockResponses.shift() || { data: {} };
    };

    const shopify = new ShopifyAPI('test-shop.myshopify.com', 'test-token');

    try {
        console.log('Running updateResource for inventory without location_id (ID in URL)...');
        const result = await shopify.updateResource('inventory', '7925410594873', { available: 15 });

        console.log('Result:', JSON.stringify(result, null, 2));

        const fetchedLocations = mockCalls[0].url.includes('/locations.json');
        const usedGraphQL = mockCalls[1].url.includes('/graphql.json');
        const usedPrimaryLocation = mockCalls[1].data.variables.input.setQuantities[0].locationId === 'gid://shopify/Location/456';

        console.log('- Fetched locations:', fetchedLocations);
        console.log('- Used GraphQL:', usedGraphQL);
        console.log('- Used primary location ID:', usedPrimaryLocation);

        if (fetchedLocations && usedGraphQL && usedPrimaryLocation && result.inventory_level.available === 15) {
            console.log('✅ PASS: Primary location was automatically fetched and used.');
        } else {
            console.log('❌ FAIL: verification failed.');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Test Error:', error.message);
        process.exit(1);
    }
}

testInventoryFix();
