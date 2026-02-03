const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * Generate a unique API key
 */
function generateApiKey() {
  return `sk_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Generate API secret
 */
function generateApiSecret() {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Encrypt sensitive data
 */
function encrypt(text) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(config.security.apiKeyEncryptionSecret, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 */
function decrypt(text) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(config.security.apiKeyEncryptionSecret, 'salt', 32);
  
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = parts.join(':');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hash API key for comparison
 */
function hashApiKey(apiKey) {
  return crypto
    .createHmac('sha256', config.security.apiKeyEncryptionSecret)
    .update(apiKey)
    .digest('hex');
}

/**
 * Verify API key matches hash
 */
function verifyApiKey(apiKey, hashedKey) {
  const hash = hashApiKey(apiKey);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedKey));
}

module.exports = {
  generateApiKey,
  generateApiSecret,
  encrypt,
  decrypt,
  hashApiKey,
  verifyApiKey
};
