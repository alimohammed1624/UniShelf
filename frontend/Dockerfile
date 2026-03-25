# ── Stage 1: Install dependencies ──
FROM oven/bun:latest AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ── Stage 2: Build the Next.js app ──
FROM oven/bun:latest AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN bun run build

# ── Final unified stage: supports both dev and prod modes ──
FROM oven/bun:latest
WORKDIR /app

# Copy all dependencies and source code
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy the built output for production mode
COPY --from=builder /app/.next ./.next

# Copy and make entrypoint executable
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["./entrypoint.sh"]
