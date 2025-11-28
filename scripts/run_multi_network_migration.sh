#!/bin/bash

# Multi-Network Wallet Migration Script
# This script migrates existing users to multi-network wallet support

echo "🚀 Starting Multi-Network Wallet Migration..."
echo "=============================================="

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if the migration script exists
if [ ! -f "scripts/migrate_existing_users_to_multi_network.mjs" ]; then
    echo "❌ Error: Migration script not found"
    exit 1
fi

# Set NODE_ENV to ensure proper configuration loading
export NODE_ENV=${NODE_ENV:-production}

echo "📋 Environment: $NODE_ENV"
echo "📁 Working Directory: $(pwd)"
echo ""

# Run the migration script
echo "🔄 Executing migration script..."
node scripts/migrate_existing_users_to_multi_network.mjs

# Check exit status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo "🎉 Existing users now have multi-network wallet support"
    echo "💰 Users can now create USDT bounties and access multi-currency features"
else
    echo ""
    echo "❌ Migration failed!"
    echo "📋 Please check the logs above for error details"
    exit 1
fi