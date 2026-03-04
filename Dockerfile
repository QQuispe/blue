# Development Dockerfile
# Used by docker-compose.yml for local development

FROM node:20-bookworm

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Expose port
EXPOSE 3000

# Build initially (will be replaced by volume mount in dev)
RUN npm run build

# Default command (overridden by docker-compose.yml for dev)
CMD ["npm", "run", "build"]
