FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY notification-service/package*.json ./notification-service/

RUN npm ci -w @ismart/notification-service --omit=dev

COPY notification-service/src ./notification-service/src
COPY notification-service/tsconfig.json ./notification-service/

WORKDIR /app/notification-service
CMD ["node", "--experimental-strip-types", "src/server.ts"]
