#!/bin/bash
# Start the production server with SQLite settings storage

echo "Installing dependencies..."
npm install express cors sql.js

echo ""
echo "Starting server..."
node server.js
