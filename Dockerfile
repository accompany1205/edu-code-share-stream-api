FROM node:18-alpine as base

FROM base as deps
WORKDIR /app
COPY package*.json ./
RUN npm i

FROM base as build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

RUN rm -rf node_modules && npm i --production

FROM base as runner
WORKDIR /app
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist .

ENV PORT=8080
EXPOSE 8080
USER node

CMD ["node", "/app/index.js"]