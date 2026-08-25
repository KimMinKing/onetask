FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 빌드 시점에 API URL 주입
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S onetask && adduser -S onetask -G onetask

COPY --from=builder --chown=onetask:onetask /app/public ./public
COPY --from=builder --chown=onetask:onetask /app/.next/standalone ./
COPY --from=builder --chown=onetask:onetask /app/.next/static ./.next/static
USER onetask

EXPOSE 3000
CMD ["node", "server.js"]
