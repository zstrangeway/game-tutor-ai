FROM node:23-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Expose port
EXPOSE 3001

# We'll mount the source code as a volume in docker-compose
# so we only need to install dependencies here

# This will use the mounted volumes and generate Prisma client
CMD ["sh", "-c", "cd /app && pnpm install && cd apps/game-api && pnpm db:generate && cd /app && pnpm --filter=game-api dev"] 