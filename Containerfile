# Based on https://bun.com/guides/ecosystem/docker
# See https://hub.docker.com/r/oven/bun for other image variants.

FROM oven/bun:alpine AS base
WORKDIR /usr/src/app

FROM base AS build
COPY . .
RUN bun install --production --frozen-lockfile
RUN bun build --production --outdir=server/public ui/index.html ui/worker.ts

FROM base AS release

LABEL org.opencontainers.image.base.name="docker.io/oven/bun:alpine"

ENV NOTIFIER_HTTP_IP=0.0.0.0
ENV NOTIFIER_DB_DSN=postgres://notifier@host.containers.internal/notifier

COPY --from=build /usr/src/app/server server

USER bun
EXPOSE 8080/tcp
ENTRYPOINT [ "bun", "run", "server/server.ts" ]
