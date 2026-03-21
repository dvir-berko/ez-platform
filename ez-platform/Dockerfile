FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY package.json app-config.yaml app-config.production.yaml ./
COPY packages ./packages

RUN yarn install --network-timeout 300000
RUN yarn build:all

FROM node:20-bookworm-slim

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY --from=build /app /app

RUN chown -R node:node /app

USER node

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=7007

EXPOSE 7007

CMD ["yarn", "start-prod"]
