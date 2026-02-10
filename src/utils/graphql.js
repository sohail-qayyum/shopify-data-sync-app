const axios = require('axios');
const config = require('../config');

/**
 * GraphQL utility for Shopify Admin API
 * Handles GraphQL queries for resources not available in REST API
 */
class ShopifyGraphQL {
  constructor(shopDomain, accessToken) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
    this.apiVersion = config.shopify.apiVersion;
    this.baseUrl = `https://${shopDomain}/admin/api/${this.apiVersion}/graphql.json`;
  }

  /**
   * Execute a GraphQL query
   */
  async query(graphqlQuery, variables = {}) {
    try {
      const response = await axios.post(
        this.baseUrl,
        {
          query: graphqlQuery,
          variables: variables
        },
        {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.errors) {
        const error = new Error('GraphQL query failed');
        error.graphqlErrors = response.data.errors;
        throw error;
      }

      return response.data.data;
    } catch (error) {
      if (error.response) {
        const shopifyError = new Error(error.response.data?.errors?.[0]?.message || 'GraphQL request failed');
        shopifyError.statusCode = error.response.status;
        shopifyError.graphqlErrors = error.response.data?.errors;
        throw shopifyError;
      }
      throw error;
    }
  }

  /**
   * Get returns with pagination
   */
  async getReturns(first = 50, after = null) {
    const query = `
      query getReturns($first: Int!, $after: String) {
        returns(first: $first, after: $after) {
          edges {
            node {
              id
              name
              status
              updatedAt
              order {
                id
                name
              }
            }
          }
        }
      }
    `;

    return this.query(query, { first, after });
  }

  /**
   * Get a specific return by ID
   */
  async getReturn(returnId) {
    const query = `
      query getReturn($id: ID!) {
        return(id: $id) {
          id
          name
          status
          totalQuantity
          order {
            id
            name
            customer {
              id
              displayName
              email
            }
          }
          returnLineItems(first: 50) {
            edges {
              node {
                id
                quantity
                returnReason
                returnReasonNote
                refundableQuantity
                refundedQuantity
                customerNote
              }
            }
          }
        }
      }
    `;

    return this.query(query, { id: returnId });
  }

  /**
   * Get discounts (modern discount API)
   */
  async getDiscounts(first = 50, after = null) {
    const query = `
      query getDiscounts($first: Int!, $after: String) {
        discountNodes(first: $first, after: $after) {
          edges {
            node {
              id
              discount {
                ... on DiscountCodeBasic {
                  title
                  status
                  codes(first: 1) {
                    edges {
                      node {
                        code
                      }
                    }
                  }
                  customerGets {
                    value {
                      ... on DiscountPercentage {
                        percentage
                      }
                      ... on DiscountAmount {
                        amount {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                  startsAt
                  endsAt
                }
                ... on DiscountAutomaticBasic {
                  title
                  status
                  customerGets {
                    value {
                      ... on DiscountPercentage {
                        percentage
                      }
                      ... on DiscountAmount {
                        amount {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                  startsAt
                  endsAt
                }
              }
            }
            cursor
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    return this.query(query, { first, after });
  }

  /**
   * Get order edits
   */
  async getOrderEdits(orderId) {
    const query = `
      query getOrderEdits($orderId: ID!) {
        order(id: $orderId) {
          id
          name
          lineItems(first: 50) {
            edges {
              node {
                id
                title
                quantity
              }
            }
          }
        }
      }
    `;

    return this.query(query, { orderId });
  }

  /**
   * Get Shopify Payments payouts
   */
  async getPayouts(first = 50, after = null) {
    const query = `
      query getPayouts($first: Int!, $after: String) {
        shopifyPaymentsAccount {
          payouts(first: $first, after: $after) {
            edges {
              node {
                id
                status
                issuedAt
                net {
                  amount
                  currencyCode
                }
                gross {
                  amount
                  currencyCode
                }
                summary {
                  adjustmentsFee {
                    amount
                    currencyCode
                  }
                  chargesFee {
                    amount
                    currencyCode
                  }
                  refundsFee {
                    amount
                    currencyCode
                  }
                }
              }
              cursor
            }
            pageInfo {
              hasNextPage
            }
          }
        }
      }
    `;

    return this.query(query, { first, after });
  }

  /**
   * Get payment disputes
   */
  async getDisputes(first = 50, after = null) {
    const query = `
      query getDisputes($first: Int!, $after: String) {
        shopifyPaymentsAccount {
          disputes(first: $first, after: $after) {
            edges {
              node {
                id
                status
                initiatedAt
                amount {
                  amount
                  currencyCode
                }
                reasonDetails {
                   reason
                }
                order {
                  id
                  name
                }
              }
              cursor
            }
            pageInfo {
              hasNextPage
            }
          }
        }
      }
    `;

    return this.query(query, { first, after });
  }

  /**
   * Get detailed transaction information for an order
   */
  async getOrderTransactions(orderId) {
    const query = `
      query getOrderTransactions($orderId: ID!) {
        order(id: $orderId) {
          id
          name
          transactions(first: 50) {
            id
            kind
            status
            amountSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            gateway
            processedAt
            paymentDetails {
              ... on CardPaymentDetails {
                paymentMethodName
              }
            }
          }
        }
      }
    `;

    return this.query(query, { orderId });
  }
}

module.exports = ShopifyGraphQL;
