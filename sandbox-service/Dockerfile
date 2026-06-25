FROM node:24-alpine

RUN apk add --no-cache docker-cli

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY tsconfig.json .

CMD ["node", "--experimental-strip-types", "src/server.ts"]
