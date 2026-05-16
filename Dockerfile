FROM node:18-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN echo "=== SOURCE CHECK ===" && head -3 client/src/pages/landing.tsx && grep -c "0a0a0f" client/src/pages/landing.tsx
RUN npm run build
RUN echo "=== BUILD OUTPUT ===" && ls -la dist/public/ && ls -la dist/public/assets/ && echo "=== DARK THEME CHECK ===" && grep -rl "0a0a0f" dist/public/assets/ || echo "NO DARK THEME FOUND IN BUILD OUTPUT"

FROM node:18-slim
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY --from=build /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
