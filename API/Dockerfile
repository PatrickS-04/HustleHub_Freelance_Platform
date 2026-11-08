FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Production dependencies only, from the lockfile.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
# Only node runs from here on, so npm and its bundled packages are removed.
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

COPY server.js app.js ./
COPY config ./config
COPY controllers ./controllers
COPY middleware ./middleware
COPY models ./models
COPY routes ./routes
COPY utils ./utils

# Certs and secrets are never baked in: certs are mounted, env comes from compose.
USER node
EXPOSE 3443
CMD ["node", "server.js"]
