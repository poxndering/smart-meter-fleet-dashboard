# syntax=docker/dockerfile:1

# ----------------------------------------------------
# Stage 1: Base & Dependencies
# ----------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# ----------------------------------------------------
# Stage 2: Development (Live reload with Vite)
# ----------------------------------------------------
FROM base AS development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ----------------------------------------------------
# Stage 3: Builder (Production build)
# ----------------------------------------------------
FROM base AS builder
COPY . .
RUN npm run build

# ----------------------------------------------------
# Stage 4: Production (Nginx static web server)
# ----------------------------------------------------
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

