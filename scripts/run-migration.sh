#!/bin/bash
# Script to apply the onramp transactions migration

# Get the database URL from the environment file
DB_URL=$(grep -i 'DATABASE_URL' /home/ubuntu/GitHubIdentity/server/.env | cut -d '"' -f 2)

# Apply the migration using psql
echo "Applying migration: 0008_add_onramp_transactions_table.sql"
PGPASSWORD=$(echo $DB_URL | sed -E 's/.*:\/\/[^:]+:([^@]+)@.*/\1/') \
psql "$DB_URL" -f migrations/0008_add_onramp_transactions_table.sql

# Check the result
if [ $? -eq 0 ]; then
  echo "Migration applied successfully!"
else
  echo "Error applying migration"
  exit 1
fi
