FROM node:23-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Expose port
EXPOSE 3000

# Start the server
CMD ["sh", "-c", "cd /app && pnpm install && pnpm --filter=plydojo-web dev"] 
