const express = require('express');
const router = express.Router();
const ShopifyGraphQL = require('../utils/graphql');
const { verifyApiKey, logOperation } = require('../middleware/auth');

// Apply authentication middleware to all GraphQL routes
router.use(verifyApiKey);

/**
 * Helper function to check GraphQL-specific scopes
 */
function requireGraphQLScope(scope) {
    return (req, res, next) => {
        if (!req.scopes || !req.scopes.includes(scope)) {
            // Check if write scope can satisfy read requirement
            if (scope.startsWith('read_')) {
                const writeScope = scope.replace('read_', 'write_');
                if (req.scopes && req.scopes.includes(writeScope)) {
                    return next();
                }
            }

            return res.status(403).json({
                error: 'Insufficient permissions',
                message: `Your API key lacks the '${scope}' scope required for this GraphQL resource.`,
                requiredScope: scope,
                yourScopes: req.scopes
            });
        }
        next();
    };
}

// ===== RETURNS =====

/**
 * GET /api/v1/graphql/returns - Get all returns
 */
router.get('/returns', requireGraphQLScope('read_returns'), async (req, res) => {
    try {
        const { first = 50, after } = req.query;
        const graphql = new ShopifyGraphQL(req.shopDomain, req.accessToken);
        const result = await graphql.getReturns(parseInt(first), after);

        await logOperation(req, 'READ', 'returns', null, 'success');
        res.json({ success: true, data: result.returns });
    } catch (error) {
        await logOperation(req, 'READ', 'returns', null, 'error');
        res.status(error.statusCode || 500).json({
            error: 'Failed to fetch returns',
            message: error.message,
            graphqlErrors: error.graphqlErrors
        });
    }
});

/**
 * GET /api/v1/graphql/returns/:id - Get specific return
 */
router.get('/returns/:id', requireGraphQLScope('read_returns'), async (req, res) => {
    try {
        const { id } = req.params;
        const graphql = new ShopifyGraphQL(req.shopDomain, req.accessToken);

        // Convert numeric ID to GraphQL ID format if needed
        const gid = id.startsWith('gid://') ? id : `gid://shopify/Return/${id}`;
        const result = await graphql.getReturn(gid);

        await logOperation(req, 'READ', 'returns', id, 'success');
        res.json({ success: true, data: result.return });
    } catch (error) {
        await logOperation(req, 'READ', 'returns', req.params.id, 'error');
        res.status(error.statusCode || 500).json({
            error: 'Failed to fetch return',
            message: error.message,
            graphqlErrors: error.graphqlErrors
        });
    }
});

// ===== DISCOUNTS =====

/**
 * GET /api/v1/graphql/discounts - Get all discounts
 */
router.get('/discounts', requireGraphQLScope('read_discounts'), async (req, res) => {
    try {
        const { first = 50, after } = req.query;
        const graphql = new ShopifyGraphQL(req.shopDomain, req.accessToken);
        const result = await graphql.getDiscounts(parseInt(first), after);

        await logOperation(req, 'READ', 'discounts', null, 'success');
        res.json({ success: true, data: result.discountNodes });
    } catch (error) {
        await logOperation(req, 'READ', 'discounts', null, 'error');
        res.status(error.statusCode || 500).json({
            error: 'Failed to fetch discounts',
            message: error.message,
            graphqlErrors: error.graphqlErrors
        });
    }
});

// ===== ORDER EDITS =====

/**
 * GET /api/v1/graphql/order-edits/:orderId - Get order edits for a specific order
 */
router.get('/order-edits/:orderId', requireGraphQLScope('read_order_edits'), async (req, res) => {
    try {
        const { orderId } = req.params;
        const graphql = new ShopifyGraphQL(req.shopDomain, req.accessToken);

        // Convert numeric ID to GraphQL ID format if needed
        const gid = orderId.startsWith('gid://') ? orderId : `gid://shopify/Order/${orderId}`;
        const result = await graphql.getOrderEdits(gid);

        await logOperation(req, 'READ', 'order_edits', orderId, 'success');
        res.json({ success: true, data: result.order });
    } catch (error) {
        await logOperation(req, 'READ', 'order_edits', req.params.orderId, 'error');
        res.status(error.statusCode || 500).json({
            error: 'Failed to fetch order edits',
            message: error.message,
            graphqlErrors: error.graphqlErrors
        });
    }
});

// ===== PAYOUTS =====

/**
 * GET /api/v1/graphql/payouts - Get Shopify Payments payouts
 */
router.get('/payouts', requireGraphQLScope('read_shopify_payments_payouts'), async (req, res) => {
    try {
        const { first = 50, after } = req.query;
        const graphql = new ShopifyGraphQL(req.shopDomain, req.accessToken);
        const result = await graphql.getPayouts(parseInt(first), after);

        await logOperation(req, 'READ', 'payouts', null, 'success');
        res.json({ success: true, data: result.shopifyPaymentsAccount?.payouts });
    } catch (error) {
        await logOperation(req, 'READ', 'payouts', null, 'error');
        res.status(error.statusCode || 500).json({
            error: 'Failed to fetch payouts',
            message: error.message,
            graphqlErrors: error.graphqlErrors
        });
    }
});

// ===== DISPUTES =====

/**
 * GET /api/v1/graphql/disputes - Get payment disputes
 */
router.get('/disputes', requireGraphQLScope('read_shopify_payments_disputes'), async (req, res) => {
    try {
        const { first = 50, after } = req.query;
        const graphql = new ShopifyGraphQL(req.shopDomain, req.accessToken);
        const result = await graphql.getDisputes(parseInt(first), after);

        await logOperation(req, 'READ', 'disputes', null, 'success');
        res.json({ success: true, data: result.shopifyPaymentsAccount?.disputes });
    } catch (error) {
        await logOperation(req, 'READ', 'disputes', null, 'error');
        res.status(error.statusCode || 500).json({
            error: 'Failed to fetch disputes',
            message: error.message,
            graphqlErrors: error.graphqlErrors
        });
    }
});

// ===== TRANSACTIONS (GraphQL) =====

/**
 * GET /api/v1/graphql/transactions/:orderId - Get detailed transaction info for an order
 */
router.get('/transactions/:orderId', requireGraphQLScope('read_orders'), async (req, res) => {
    try {
        const { orderId } = req.params;
        const graphql = new ShopifyGraphQL(req.shopDomain, req.accessToken);

        // Convert numeric ID to GraphQL ID format if needed
        const gid = orderId.startsWith('gid://') ? orderId : `gid://shopify/Order/${orderId}`;
        const result = await graphql.getOrderTransactions(gid);

        await logOperation(req, 'READ', 'transactions', orderId, 'success');
        res.json({ success: true, data: result.order });
    } catch (error) {
        await logOperation(req, 'READ', 'transactions', req.params.orderId, 'error');
        res.status(error.statusCode || 500).json({
            error: 'Failed to fetch transactions',
            message: error.message,
            graphqlErrors: error.graphqlErrors
        });
    }
});

module.exports = router;
