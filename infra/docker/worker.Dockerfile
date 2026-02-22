# Worker Service Dockerfile
FROM node:20-alpine

# Fix certificate issues by using HTTP for repositories (temporary workaround for build environment)
RUN sed -i 's/https/http/' /etc/apk/repositories

# Fix certificate issues
RUN apk update && apk add --no-cache ca-certificates && update-ca-certificates

# Install dependencies for native modules and PDF processing
RUN apk add --no-cache libc6-compat openssl ghostscript libreoffice tesseract-ocr tesseract-ocr-data-eng imagemagick qpdf \
    ttf-dejavu ttf-liberation ttf-freefont font-noto font-noto-cjk ffmpeg

WORKDIR /app

# Copy root package files
COPY package.json ./
COPY workers/pdf-processor/package.json ./workers/pdf-processor/
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies
RUN npm install --legacy-peer-deps

# Copy Prisma schema first (for generate)
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
WORKDIR /app

# Copy shared package
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/

# Build Shared package
WORKDIR /app/packages/shared
RUN npm install
RUN npm run build
WORKDIR /app

# Copy worker source
COPY workers/pdf-processor/src ./workers/pdf-processor/src
COPY workers/pdf-processor/tsconfig.json ./workers/pdf-processor/

# Build worker
WORKDIR /app/workers/pdf-processor
RUN npm run build

# Start command
CMD ["npm", "run", "start"]
