FROM node:20-alpine
WORKDIR /app

# Install build dependencies for node-canvas
RUN apk add --no-cache \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    python3 \
    make

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5001
CMD ["npm", "start"]
