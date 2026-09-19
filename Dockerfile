# syntax=docker/dockerfile:1
#
# TaskAgent の開発・CI 用イメージ。
# ローカル開発（dev）と CI/CD（ci）で同じ土台を使い、「自分の PC では動く」を無くす。
#
# 重要: ベースは Debian（glibc）。Cloudflare のローカルランタイム workerd は musl でビルドされておらず、
# alpine では `pnpm test:workers` が起動しない。詳細は docs/notes/docker-dev.md。

# ---------- base: 全ステージ共通のツールチェーン ----------
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    npm_config_store_dir=/pnpm/store \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates git curl \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable \
 && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# ---------- deps: 依存解決だけの層（ソースを変えても再実行されない） ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile

# ---------- dev: ローカル開発。compose からソースをバインドマウントして使う ----------
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
# .wrangler にはローカル D1 の実体が入る。非 root でも書けるようにしておく
RUN mkdir -p /app/.wrangler /app/dist && chown -R node:node /app /pnpm
USER node
EXPOSE 5173
CMD ["pnpm", "dev"]

# ---------- ci: 検証とデプロイ。ソースを焼き込み、GitHub Actions から docker run する ----------
FROM base AS ci
ENV CI=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["pnpm", "verify"]
