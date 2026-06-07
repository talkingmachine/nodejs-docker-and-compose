# --- Этап 1: сборка ---
FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Этап 2: запуск ---
FROM node:16-alpine
WORKDIR /app
RUN npm install -g pm2
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY ecosystem.config.js ./
EXPOSE 3000
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
