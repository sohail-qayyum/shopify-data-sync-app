#!/bin/bash

# Shopify Data Sync App - GitHub Setup Script
# This script will help you create the repository and push to GitHub

echo "=========================================="
echo "Shopify Data Sync App - GitHub Setup"
echo "=========================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install git first."
    exit 1
fi

echo "✅ Git is installed"
echo ""

# Get GitHub username
read -p "Enter your GitHub username [sohail-qayyum]: " GITHUB_USER
GITHUB_USER=${GITHUB_USER:-sohail-qayyum}

# Get repository name
read -p "Enter repository name [shopify-data-sync-app]: " REPO_NAME
REPO_NAME=${REPO_NAME:-shopify-data-sync-app}

echo ""
echo "📋 Configuration:"
echo "   GitHub User: $GITHUB_USER"
echo "   Repository: $REPO_NAME"
echo ""

# Initialize git if not already done
if [ ! -d .git ]; then
    echo "🔧 Initializing git repository..."
    git init
    git branch -M main
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

# Check if remote exists
if git remote | grep -q "origin"; then
    echo "🔧 Removing existing remote..."
    git remote remove origin
fi

# Add remote
echo "🔧 Adding GitHub remote..."
git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
echo "✅ Remote added"

# Stage all files
echo "🔧 Staging files..."
git add .
echo "✅ Files staged"

# Commit
echo "🔧 Creating commit..."
git commit -m "Initial commit: Complete Shopify Data Sync App

Features:
- Multi-tenant Shopify app with OAuth authentication
- API key management system
- Real-time webhook integration
- RESTful API for external portal access
- Orders, customers, products, inventory, fulfillment endpoints
- Admin UI embedded in Shopify dashboard
- Activity logging and monitoring
- PostgreSQL database with migrations
- Production-ready security features
- Comprehensive documentation"

echo "✅ Commit created"
echo ""

echo "=========================================="
echo "⚠️  IMPORTANT - Next Steps"
echo "=========================================="
echo ""
echo "1. Go to GitHub: https://github.com/$GITHUB_USER"
echo "2. Click 'New Repository' (green button)"
echo "3. Repository name: $REPO_NAME"
echo "4. Description: Multi-tenant Shopify app for real-time data synchronization"
echo "5. Choose Public or Private"
echo "6. Do NOT initialize with README (we already have one)"
echo "7. Click 'Create repository'"
echo ""
echo "8. Then run this command to push:"
echo "   git push -u origin main"
echo ""
echo "If you get authentication errors, GitHub now requires:"
echo "   - Personal Access Token (not password)"
echo "   - Go to: Settings → Developer settings → Personal access tokens → Tokens (classic)"
echo "   - Generate new token with 'repo' scope"
echo "   - Use the token as password when prompted"
echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
