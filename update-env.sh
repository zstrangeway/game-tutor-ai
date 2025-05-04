#!/bin/bash

# Update game-api .env file
cat > apps/game-api/.env << EOF
# Database Connection
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/gametutor

# Application Settings
PORT=3001
NODE_ENV=development

# API Configuration
API_PREFIX=/api
API_VERSION=1

# JWT Authentication
JWT_SECRET=local-dev-secret-key
JWT_EXPIRATION=1d

# Logging Configuration
LOG_LEVEL=debug
EOF

echo "Updated game-api .env file"

# Update plydojo-web .env file
cat > apps/plydojo-web/.env << EOF
# Application Settings
NODE_ENV=development

# API Connection
NEXT_PUBLIC_API_URL=http://game-api:3001
NEXT_PUBLIC_API_VERSION=1

# UI Customization
NEXT_PUBLIC_APP_NAME=GameTutor AI
NEXT_PUBLIC_DEFAULT_THEME=dark

# Analytics (disabled for development)
NEXT_PUBLIC_ANALYTICS_ENABLED=false
EOF

echo "Updated plydojo-web .env file"

# Make the script executable
chmod +x update-env.sh

echo "Done! You can now run this script with ./update-env.sh" 