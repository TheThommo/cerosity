FROM node:20-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Railway injects this at build time; also helps layer invalidation after NO_CACHE is removed.
ARG RAILWAY_GIT_COMMIT_SHA=unknown
ENV RAILWAY_GIT_COMMIT_SHA=${RAILWAY_GIT_COMMIT_SHA}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# One build step: vite client + esbuild server + deploy manifest (see scripts/write-deploy-manifest.mjs).
RUN npm run build \
  && test -f dist/index.js \
  && test -f dist/public/index.html \
  && test -f dist/public/deploy.json \
  && grep -q '"hasDarkTheme": true' dist/public/deploy.json \
  && echo "deploy-manifest:" && cat dist/public/deploy.json

ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/index.js"]
