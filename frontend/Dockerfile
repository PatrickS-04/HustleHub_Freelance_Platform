# Build the SPA, then serve the static files from nginx over HTTPS.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
# Baked into the bundle at build time; must match the API's public address.
ARG VITE_API_URL=https://localhost:3443
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.30-alpine
# Base image lags Alpine's security fixes; Trivy in CI fails the build on these.
RUN apk upgrade --no-cache
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
# nginx substitutes ${API_URL} into the CSP connect-src at startup.
ARG VITE_API_URL=https://localhost:3443
ENV API_URL=$VITE_API_URL NGINX_ENVSUBST_FILTER=^API_URL$
EXPOSE 443
