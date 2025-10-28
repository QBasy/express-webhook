FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci && \
    npm cache clean --force

COPY src/ ./src/
COPY index.ts ./

RUN npx tsc

FROM node:20-alpine

RUN apk add --no-cache dumb-init

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && \
npm cache clean --force

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

COPY --chown=nodejs:nodejs src/static ./dist/src/static

RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app/logs

USER nodejs

EXPOSE 6005

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:6005/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]