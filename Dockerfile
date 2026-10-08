# syntax=docker/dockerfile:1
# check=error=true

# Production image: the Rails API plus the built React client, served from one origin.
#
#   docker build -t shop .
#   docker run -p 3000:3000 -e DATABASE_URL=postgres://... -e SECRET_KEY_BASE=... shop
#
# Or locally against the compose database: docker compose --profile prod up --build

ARG RUBY_VERSION=3.4.11
ARG NODE_VERSION=24

# --- 1. React client ---------------------------------------------------------
FROM docker.io/library/node:${NODE_VERSION}-alpine AS frontend
WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# --- 2. Rails ----------------------------------------------------------------
FROM docker.io/library/ruby:$RUBY_VERSION-slim AS base
WORKDIR /rails

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y curl libjemalloc2 postgresql-client && \
    ln -s /usr/lib/$(uname -m)-linux-gnu/libjemalloc.so.2 /usr/local/lib/libjemalloc.so && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development:test" \
    LD_PRELOAD="/usr/local/lib/libjemalloc.so"

FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git libpq-dev libyaml-dev pkg-config && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY backend/Gemfile backend/Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git && \
    bundle exec bootsnap precompile -j 1 --gemfile

COPY backend/ ./
# A checkout made on Windows may lose the executable bit on bin/ scripts.
RUN chmod +x bin/* && \
    bundle exec bootsnap precompile -j 1 app/ lib/

# Hashed JS/CSS go to public/ (served with far-future caching); index.html is
# served by SpaController with no-cache for every client-side route.
COPY --from=frontend /frontend/dist/ ./public/
RUN mkdir -p spa && mv public/index.html spa/index.html

# --- 3. Runtime image ----------------------------------------------------------
FROM base

RUN groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash
USER 1000:1000

COPY --chown=rails:rails --from=build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --chown=rails:rails --from=build /rails /rails

# Prepares the database (migrations + demo seeds) before the server starts.
ENTRYPOINT ["/rails/bin/docker-entrypoint"]

# Puma listens on $PORT (hosting providers set it), 3000 by default.
EXPOSE 3000
CMD ["./bin/rails", "server"]
