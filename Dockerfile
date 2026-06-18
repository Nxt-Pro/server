FROM node:20-bookworm-slim

WORKDIR /app

ENV PORT=3000

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
