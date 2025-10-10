# Use Node.js 18 alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for Vite)
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Set PATH to include node_modules/.bin
ENV PATH="/app/node_modules/.bin:$PATH"

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD ["node", "node_modules/vite/bin/vite.js"]