# Build stage for frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY components.json ./
COPY next.config.js ./
COPY next.config.ts ./
COPY postcss.config.mjs ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src
COPY public ./public

# Build the frontend
RUN npm run build

# Build stage for backend
FROM python:3.11-slim AS backend-builder

WORKDIR /app/backend

# Copy backend requirements
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Copy backend files
COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY backend ./backend

# Copy frontend build
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/package*.json ./
COPY --from=frontend-builder /app/node_modules ./node_modules

# Copy environment files
COPY .env.local.example ./.env.local

# Expose ports
EXPOSE 3000 8000

# Create startup script
RUN echo '#!/bin/sh\n\
cd /app\n\
npm run start & \n\
cd /app/backend\n\
uvicorn app:app --host 0.0.0.0 --port 8000\n\
' > /app/start.sh && chmod +x /app/start.sh

# Set environment variables
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1

# Start the application
CMD ["/app/start.sh"] 