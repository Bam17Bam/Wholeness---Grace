#!/bin/bash
# This script runs automatically when the PostgreSQL container starts
# since it's mounted as /docker-entrypoint-initdb.d/init-db.sh
set -e

echo "Initializing Wholeness and Grace database..."
echo "Database 'wholeness_grace' is ready for migrations."
