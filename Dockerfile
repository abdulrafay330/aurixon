# Stage 1: Build the Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
# Copy frontend package files
COPY frontend/package.json frontend/package-lock.json ./
# Install dependencies
RUN npm ci
# Copy source code
COPY frontend/ ./
# Build the application
# Set default API URL to relative path for Docker (served by same origin)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Stage 2: Setup the Backend and Serve
FROM node:20-alpine
WORKDIR /app
# Copy backend package files
COPY backend/package.json backend/package-lock.json ./backend/
# Install backend dependencies
WORKDIR /app/backend
RUN npm ci --omit=dev

# Copy backend source code
COPY backend/ ./

# Copy built frontend assets from Stage 1 to the location expected by server.js
# server.js expects: path.join(__dirname, '../../frontend/dist')
# So we need to reconstruct that structure relative to /app/backend/src
# /app/backend/src/server.js -> ../../frontend/dist -> /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose the port the app runs on
EXPOSE 5001

# Command to run the application
CMD ["npm", "start"]
