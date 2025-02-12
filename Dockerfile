FROM node:23-alpine

COPY dist /app/
WORKDIR /app

RUN npm install --only=production

ENV NODE_ENV=production
LABEL org.opencontainers.image.source=https://github.com/not-three/api
LABEL org.opencontainers.image.title="not-th.re/ui"
LABEL org.opencontainers.image.description="!3 is a simple, secure and open source paste sharing platform."
LABEL org.opencontainers.image.authors="Joschua Becker EDV <support@scolasti.co>"
WORKDIR /data
STOPSIGNAL SIGKILL
ENTRYPOINT [ "node", "/app/src/not3.js" ]
