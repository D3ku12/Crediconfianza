# ---- Build del frontend ----
FROM node:20-alpine AS frontend-build

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --legacy-peer-deps --prefer-offline
COPY client/ ./
RUN npm run build

# ---- Servidor de producción ----
FROM node:20-alpine AS production

WORKDIR /app
COPY server/package*.json ./server/
RUN npm ci --prefix server --legacy-peer-deps --omit=dev --prefer-offline
COPY server/ ./server/
COPY --from=frontend-build /app/client/dist ./client/dist

EXPOSE 3000
CMD ["node", "server/index.js"]
