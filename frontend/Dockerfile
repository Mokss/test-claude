FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY specs/ ./specs/
COPY frontend/package*.json ./frontend/

RUN npm ci -w @ismart/frontend

COPY frontend/ ./frontend/

WORKDIR /app/frontend
RUN npm run build
