# Game Tutor AI

This template is for creating a monorepo with shadcn/ui.

## Development with Docker

The recommended way to develop with this application is using Docker. This ensures consistent development environments across all machines.

### Prerequisites

- Docker and Docker Compose installed on your machine

### Environment Setup

Before starting the application, you need to create .env files for each app:

1. For the game-api:
```bash
# Create .env file for game-api
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
```

2. For the plydojo-web:
```bash
# Create .env file for plydojo-web
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
```

### Starting the Application

To start all services:

```bash
docker compose up
```

Or to run in detached mode:

```bash
docker compose up -d
```

This will start:
- PostgreSQL database on port 5433
- game-api (NestJS) on port 3001
- plydojo-web (Next.js) on port 3000

### Stopping the Application

```bash
docker compose down
```

### Viewing Logs

```bash
docker compose logs -f
```

For specific services:

```bash
docker compose logs -f game-api
docker compose logs -f plydojo-web
```

### Hot Reloading

The setup fully supports hot reloading for both applications:

- Your local source code directory is mounted into the containers
- Any changes to your source files are immediately detected 
- The applications will automatically rebuild and reload
- Node modules are kept in named volumes for performance

Just edit files in your local IDE, save, and the changes will be reflected in the running applications.

## Usage without Docker

```bash
pnpm dlx shadcn@latest init
```

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Tailwind

Your `tailwind.config.ts` and `globals.css` are already set up to use the components from the `ui` package.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button"
```
