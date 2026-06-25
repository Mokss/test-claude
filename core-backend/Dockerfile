FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY specs/ ./specs/
COPY core-backend/package*.json ./core-backend/

RUN npm ci -w @ismart/core-backend --omit=dev

COPY core-backend/src ./core-backend/src
COPY core-backend/tsconfig.json ./core-backend/

WORKDIR /app/core-backend
CMD ["node", "--experimental-strip-types", "src/server.ts"]
