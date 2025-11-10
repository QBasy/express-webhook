FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY svelte.config.js tsconfig.json vite.config.ts ./
COPY src ./src
COPY static ./static

RUN npm install
RUN npm run build

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/build ./build
COPY package*.json ./
RUN npm install --omit=dev

EXPOSE 3000

CMD ["node", "build/index.js"]
