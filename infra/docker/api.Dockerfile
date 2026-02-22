# API Service Dockerfile
FROM node:20-alpine

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy root package files for workspaces
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/shared/package.json ./packages/shared/

# Copy shared package source and config BEFORE npm install
# This ensures workspace symlinks include the actual source
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/

# Install all dependencies (creates workspace symlinks)
RUN npm install --legacy-peer-deps

# Build shared package (dist now exists in packages/shared/)
# The symlink in node_modules/@desi/shared points to packages/shared
# So dist/ will be accessible via the symlink
WORKDIR /app/packages/shared
RUN npm run build

# Verify shared dist was created
RUN ls -la dist/ && ls -la /app/node_modules/@desi/shared/

# Copy Prisma schema
WORKDIR /app
COPY packages/prisma/prisma ./packages/prisma/prisma
COPY packages/prisma/src ./packages/prisma/src
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/prisma/tsconfig.json ./packages/prisma/

# Generate Prisma client
RUN npx prisma generate --schema=./packages/prisma/prisma/schema.prisma

# Build Prisma package
WORKDIR /app/packages/prisma
RUN npm install
RUN npm run build

# Copy API source
WORKDIR /app
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/nest-cli.json ./apps/api/

# Build API
WORKDIR /app/apps/api
RUN npm run build

# Expose port
EXPOSE 4000

# Start command
CMD ["node", "dist/main"]
