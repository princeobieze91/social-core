FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/server.cjs"]
