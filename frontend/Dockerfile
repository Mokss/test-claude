# Stage 1 — сборка SPA
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY specs/ ./specs/
COPY frontend/package*.json ./frontend/

RUN npm ci -w @ismart/frontend

COPY frontend/ ./frontend/

WORKDIR /app/frontend
RUN npm run build

# Stage 2 — nginx с готовой статикой и конфигом внутри
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
