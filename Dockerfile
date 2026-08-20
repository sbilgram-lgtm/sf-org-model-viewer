FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm install --workspace=server && npm install --workspace=client

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package.json ./
COPY server/package.json ./server/
RUN npm install --workspace=server --omit=dev

COPY --from=builder /app/client/dist ./client/dist
COPY server ./server

EXPOSE 3001

CMD ["node", "server/index.js"]
