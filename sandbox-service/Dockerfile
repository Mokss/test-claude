FROM node:24-alpine

RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package*.json ./
COPY sandbox-service/package*.json ./sandbox-service/

RUN npm ci -w @ismart/sandbox-service --omit=dev

COPY sandbox-service/src ./sandbox-service/src
COPY sandbox-service/tsconfig.json ./sandbox-service/

WORKDIR /app/sandbox-service
CMD ["node", "--experimental-strip-types", "src/server.ts"]
