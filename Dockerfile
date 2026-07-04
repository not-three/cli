FROM node:24-alpine

COPY package.json pnpm-lock.yaml /app/
COPY bin /app/bin
COPY dist /app/dist
WORKDIR /app

RUN apk add --no-cache nano
RUN npm i -g pnpm
RUN pnpm install --prod

ENV NODE_ENV=production
LABEL org.opencontainers.image.source=https://github.com/not-three/cli
LABEL org.opencontainers.image.title="not-th.re/cli"
LABEL org.opencontainers.image.description="!3 is a simple, secure and open source paste sharing platform."
LABEL org.opencontainers.image.authors="Joschua Becker EDV <support@scolasti.co>"
WORKDIR /data
STOPSIGNAL SIGKILL
ENTRYPOINT [ "node", "/app/bin/run.js" ]
