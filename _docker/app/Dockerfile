# --- Этап 1: Установка зависимостей ---
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# --- Этап 2: Сборка ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .


ENV BUILD_STANDALONE=true
ENV JWT_SECRET=build-time-placeholder-not-used-at-runtime-32

RUN npm run build

# --- Этап 3: Запуск (Финальный образ) ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Создаем пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 1. Копируем статику из public
COPY --from=builder /app/public ./public

# 2. Копируем standalone файлы (они копируются в корень /app)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# 3. ВАЖНО: Принудительно создаем структуру для статики .next
# Мы берем статику из билдера и кладем её ВНУТРЬ .next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3005
ENV PORT=3005
ENV HOSTNAME="0.0.0.0"

# Запускаем через node
CMD ["node", "server.js"]