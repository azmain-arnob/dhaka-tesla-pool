FROM node:24-alpine

WORKDIR /app

ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/dhaka_tesla_pool

COPY package*.json ./

RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
