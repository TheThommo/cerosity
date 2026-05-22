FROM node:20-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Railway injects these at build time.
ARG RAILWAY_GIT_COMMIT_SHA=unknown
ENV RAILWAY_GIT_COMMIT_SHA=${RAILWAY_GIT_COMMIT_SHA}

ARG VITE_STRIPE_PUBLIC_KEY
ENV VITE_STRIPE_PUBLIC_KEY=${VITE_STRIPE_PUBLIC_KEY}

ARG VITE_VAPI_PUBLIC_KEY
ENV VITE_VAPI_PUBLIC_KEY=${VITE_VAPI_PUBLIC_KEY}

ARG VITE_VAPI_ASSISTANT_ID
ENV VITE_VAPI_ASSISTANT_ID=${VITE_VAPI_ASSISTANT_ID}

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
