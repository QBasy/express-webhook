FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY svelte.config.js tsconfig.json vite.config.ts ./
COPY src ./src
COPY static ./static

RUN npm ci
RUN npm run build

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./

RUN npm ci --only=production

EXPOSE 3000

CMD ["node", "build"]