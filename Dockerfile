# Use Debian-based image to avoid glibc/SWC issues
FROM node:20-bullseye-slim AS base
WORKDIR /app

# --- deps layer (prod deps only) ---
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

# --- builder (install all deps to build) ---
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runner ---
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# copy built app and runtime deps
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=deps    /app/node_modules ./node_modules
EXPOSE 3000
# if package.json has "start": "next start"
CMD ["npm", "run", "start"]
