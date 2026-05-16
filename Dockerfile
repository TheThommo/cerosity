FROM node:18-slim
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN rm -rf dist \
    && npx vite build \
    && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
