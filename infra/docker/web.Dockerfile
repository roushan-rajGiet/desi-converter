# Frontend Dockerfile
FROM node:20-alpine

# Install dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy root package file
COPY package.json ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy web source
COPY apps/web ./apps/web

WORKDIR /app/apps/web

# Expose port
EXPOSE 3000

# Development command
CMD ["npm", "run", "dev"]
