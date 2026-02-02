# Deployment Guide

Complete step-by-step guide for deploying the Shopify Data Sync App to your VPS server.

## Prerequisites Checklist

- [ ] VPS server (Ubuntu 20.04+ recommended)
- [ ] Domain or subdomain configured
- [ ] PostgreSQL installed
- [ ] Node.js 16+ installed
- [ ] Nginx installed
- [ ] SSL certificate (Let's Encrypt)
- [ ] Shopify Partner account
- [ ] Git installed

## Step 1: Server Setup

### 1.1 Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 1.3 Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

### 1.4 Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 1.5 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

## Step 2: Database Configuration

### 2.1 Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE shopify_sync_app;
CREATE USER shopify_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE shopify_sync_app TO shopify_user;
\q
```

### 2.2 Configure PostgreSQL for Remote Access (if needed)

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Find and modify:
listen_addresses = 'localhost'

# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add this line:
host    shopify_sync_app    shopify_user    127.0.0.1/32    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Step 3: Clone and Setup Application

### 3.1 Create Application Directory

```bash
sudo mkdir -p /var/www
cd /var/www
```

### 3.2 Clone Repository

```bash
sudo git clone https://github.com/sohail-qayyum/shopify-data-sync-app.git
cd shopify-data-sync-app
```

### 3.3 Set Permissions

```bash
sudo chown -R $USER:$USER /var/www/shopify-data-sync-app
```

### 3.4 Install Dependencies

```bash
npm install --production
```

### 3.5 Create Environment File

```bash
cp .env.example .env
nano .env
```

Configure your `.env`:

```env
# Shopify Configuration
SHOPIFY_API_KEY=your_api_key_from_shopify_partner
SHOPIFY_API_SECRET=your_api_secret_from_shopify_partner
SHOPIFY_SCOPES=read_orders,write_orders,read_customers,write_customers,read_products,write_products,read_inventory,write_inventory,read_fulfillments,write_fulfillments,read_locations,read_product_listings

# App Configuration
APP_URL=https://shopify-api.yourdomain.com
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shopify_sync_app
DB_USER=shopify_user
DB_PASSWORD=your_secure_password_here

# Security Secrets (Generate random strings)
JWT_SECRET=<generate-random-64-char-string>
API_KEY_ENCRYPTION_SECRET=<generate-random-64-char-string>
SESSION_SECRET=<generate-random-64-char-string>
```

**Generate secure random strings:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.6 Run Database Migrations

```bash
npm run migrate
```

## Step 4: Configure Nginx

### 4.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/shopify-app
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name shopify-api.yourdomain.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name shopify-api.yourdomain.com;

    # SSL Configuration (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/shopify-api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shopify-api.yourdomain.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logging
    access_log /var/log/nginx/shopify-app.access.log;
    error_log /var/log/nginx/shopify-app.error.log;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Cache
        proxy_cache_bypass $http_upgrade;
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client body size (for file uploads)
    client_max_body_size 10M;
}
```

### 4.2 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/shopify-app /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 5: SSL Certificate with Let's Encrypt

### 5.1 Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 5.2 Obtain SSL Certificate

```bash
sudo certbot --nginx -d shopify-api.yourdomain.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 5.3 Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

## Step 6: Configure PM2

### 6.1 Start Application with PM2

```bash
cd /var/www/shopify-data-sync-app

pm2 start src/server.js --name shopify-app --time

# Save PM2 process list
pm2 save

# Generate startup script
pm2 startup systemd
# Copy and run the command it outputs
```

### 6.2 PM2 Configuration File (Optional)

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'shopify-app',
    script: './src/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  }]
};
```

Start with config:

```bash
pm2 start ecosystem.config.js
```

### 6.3 PM2 Monitoring

```bash
# View logs
pm2 logs shopify-app

# Monitor processes
pm2 monit

# View status
pm2 status

# Restart app
pm2 restart shopify-app

# Stop app
pm2 stop shopify-app
```

## Step 7: Create Shopify App

### 7.1 Access Shopify Partners

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Navigate to Apps
3. Click "Create app"
4. Choose "Create app manually"

### 7.2 Configure App URLs

- **App name**: Your App Name
- **App URL**: `https://shopify-api.yourdomain.com/admin`
- **Allowed redirection URL(s)**:
  ```
  https://shopify-api.yourdomain.com/auth/callback
  ```

### 7.3 Configure App Scopes

Select these scopes:
- `read_orders, write_orders`
- `read_customers, write_customers`
- `read_products, write_products`
- `read_inventory, write_inventory`
- `read_fulfillments, write_fulfillments`
- `read_locations`
- `read_product_listings`

### 7.4 Get API Credentials

1. Go to your app's "App setup" page
2. Copy the "API key" and "API secret key"
3. Update your `.env` file with these values

## Step 8: Test Installation

### 8.1 Test App Installation

1. Visit: `https://shopify-api.yourdomain.com/auth?shop=your-test-store.myshopify.com`
2. Click "Install app"
3. Approve permissions
4. Verify redirect to admin panel

### 8.2 Test API Endpoints

```bash
# Health check
curl https://shopify-api.yourdomain.com/health

# Should return: {"status":"healthy"}
```

### 8.3 Create API Key

1. In Shopify admin, go to Apps → Your App Name
2. Click "Create New API Key"
3. Save the credentials

### 8.4 Test API Access

```bash
curl -X GET "https://shopify-api.yourdomain.com/api/orders" \
  -H "X-API-Key: sk_your_key" \
  -H "X-API-Secret: your_secret"
```

## Step 9: Firewall Configuration

### 9.1 Configure UFW

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow OpenSSH

# Allow HTTP/HTTPS
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

## Step 10: Monitoring and Maintenance

### 10.1 Setup Log Rotation

Create `/etc/logrotate.d/shopify-app`:

```bash
sudo nano /etc/logrotate.d/shopify-app
```

Add:

```
/var/www/shopify-data-sync-app/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 10.2 Database Backup Script

Create `/home/your_user/backup-db.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/home/your_user/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="shopify_sync_app"

mkdir -p $BACKUP_DIR

pg_dump -U shopify_user $DB_NAME > $BACKUP_DIR/shopify_${DATE}.sql

# Keep only last 7 days
find $BACKUP_DIR -name "shopify_*.sql" -mtime +7 -delete

echo "Backup completed: shopify_${DATE}.sql"
```

Make executable:

```bash
chmod +x /home/your_user/backup-db.sh
```

Add to crontab:

```bash
crontab -e

# Add this line (daily backup at 2 AM):
0 2 * * * /home/your_user/backup-db.sh
```

### 10.3 Monitoring with PM2

```bash
# Install PM2 monitoring (optional)
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Step 11: Security Best Practices

### 11.1 Secure Environment Variables

```bash
# Set proper permissions
chmod 600 /var/www/shopify-data-sync-app/.env
```

### 11.2 Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update npm packages
cd /var/www/shopify-data-sync-app
npm update

# Restart app
pm2 restart shopify-app
```

### 11.3 Database Security

```bash
# Backup before making changes
pg_dump shopify_sync_app > backup.sql

# Regular security updates
sudo apt update postgresql
```

## Troubleshooting

### App Won't Start

```bash
# Check PM2 logs
pm2 logs shopify-app --lines 100

# Check Node.js errors
cd /var/www/shopify-data-sync-app
node src/server.js
```

### Database Connection Issues

```bash
# Test database connection
psql -U shopify_user -d shopify_sync_app -h localhost

# Check PostgreSQL status
sudo systemctl status postgresql
```

### Nginx Issues

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/shopify-app.error.log

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Renew certificate manually
sudo certbot renew --force-renewal

# Check certificate status
sudo certbot certificates
```

## Updating the Application

### Pull Latest Changes

```bash
cd /var/www/shopify-data-sync-app
git pull origin main
npm install --production
npm run migrate
pm2 restart shopify-app
```

## Performance Optimization

### 10.1 Enable Compression in Nginx

Add to nginx config:

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

### 10.2 PM2 Cluster Mode

```bash
pm2 start src/server.js -i max --name shopify-app
```

---

## Support

If you encounter issues:
1. Check the logs: `pm2 logs shopify-app`
2. Verify environment variables
3. Test database connection
4. Check Nginx configuration
5. Review firewall rules

For additional help, open an issue on GitHub.
