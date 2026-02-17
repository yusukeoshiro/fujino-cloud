# ================
# Base dependencies
# ================
FROM node:20 AS base
WORKDIR /app

# Copy root and package-level package.jsons (order matters for caching)
COPY package*.json ./

# Install all dependencies for build (cached unless package*.json changes)
RUN npm ci

# ================
# Build manager
# ================
FROM base AS build-manager


# Copy only needed files
COPY ./ ./
RUN npm run build

# ================
# Final production image
# ================
FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy only built output and package.json files
COPY --from=build-manager /app/build ./build

# Set app entry point
CMD ["node", "build/index.js"]
