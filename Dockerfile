FROM node:18-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN rm -rf dist \
    && echo "=== BUILDING $(date) ===" \
    && npx vite build \
    && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist \
    && echo "=== VERIFY ===" \
    && ls dist/public/assets/ \
    && (grep -l "0a0a0f" dist/public/assets/*.js && echo "DARK THEME CONFIRMED" || echo "DARK THEME MISSING")

FROM node:18-slim
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci
COPY --from=build /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
