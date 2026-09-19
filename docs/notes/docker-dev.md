# Docker でのローカル開発

- いつ読むか: コンテナが起動しない、HMR が効かない、依存を足したのに反映されない、テストだけコンテナで落ちるとき。
- 結論: **ベースは glibc（alpine 不可）**、**`node_modules` はホストと共有しない**、**依存を変えたら `pnpm docker:reset`**。

## 構成のあらまし

| もの | どこ | なぜ |
|---|---|---|
| ソース | ホストからバインドマウント | 保存すると即 HMR |
| `node_modules` | named volume（イメージから種を取る） | ホストの OS/CPU 向けバイナリを持ち込まない |
| `.wrangler`（ローカル D1） | named volume | コンテナを作り直してもデータが残る |
| `.dev.vars` | バインドマウント経由で wrangler が直接読む | コンテナの環境変数に秘密を置かない |

## 落とし穴

### 1. alpine では workerd が動かない
Cloudflare のローカルランタイム workerd は musl 向けにビルドされていません。`node:22-alpine` にすると `pnpm test:workers` が起動時に落ちます。`node:22-bookworm-slim`（glibc）を使います。

### 2. 依存を足したのに反映されない
`node_modules` は named volume です。Docker が volume に中身を入れるのは**新規作成時の 1 回だけ**で、イメージを再ビルドしても自動では入れ替わりません。

```bash
pnpm docker:reset   # compose down → node_modules volume 削除 → build して起動
```

`docker compose down -v` でも直りますが、そちらはローカル D1（`.wrangler`）も消えます。

### 3. HMR が効かない（macOS / Windows）
バインドマウント越しに inotify が届かないことがあります。polling に切り替えます。

```bash
VITE_USE_POLLING=1 pnpm docker:dev
```

常時有効にすると CPU を食うので、効かないときだけにします。

### 4. ブラウザから開けない
コンテナ内で `localhost` を待ち受けるとホストから届きません。`vite.config.ts` で `server.host: true`（0.0.0.0）にしています。ポートを変えるときは `DEV_PORT=5174 pnpm docker:dev`。

### 5. ファイルの所有者が root になる（Linux ホスト）
`dev` ステージは `node` ユーザー（uid 1000）で動きます。ホストのユーザーが uid 1000 でない場合、コンテナが作ったファイルの所有者がずれます。`id -u` が 1000 でなければ、`Dockerfile` の `USER node` を外すか、ホスト側で `sudo chown -R $USER:$USER .` します。

### 6. `.dockerignore` の除外が「CI でだけ落ちる」原因になる
`ci` ステージは `COPY . .` でソースを入れるため、**`.dockerignore` で除外したファイルはイメージの中に存在しません**。
検証に必要なファイルを除外すると、ローカルでは通るのに CI だけ落ちます。実際に `.github` を除外して `pnpm check:docs` が落ちました（`.claude/rules/tooling.md` の `paths` が `.github/workflows` を参照しているため）。

再現方法（Docker が無くても確かめられる）:

```bash
tar -cf - --exclude=.git --exclude=node_modules --exclude=dist . | (mkdir -p /tmp/imgsim && cd /tmp/imgsim && tar -xf -)
cd /tmp/imgsim && node scripts/check-claude-md.mjs
```

### 7. `.dockerignore` を書き忘れると秘密が焼き込まれる
`ci` ステージは `COPY . .` でソースを丸ごと入れます。`.dev.vars` や `infra/terraform/*.tfvars` は `.dockerignore` で必ず除外します（追加したら見直す）。

### 8. CI で Docker Hub の pull が 429 になる
GitHub Actions の runner は共有 IP から匿名 pull するため、レート制限に当たることがあります。頻発したら `docker/login-action` でログインしてから pull します。

### 9. イメージのビルドが毎回遅い
`Dockerfile` は `deps` ステージを分けており、`package.json` と `pnpm-lock.yaml` が変わらなければ `pnpm install` は再実行されません。遅いときは、ソースの変更で `deps` 層が壊れていないか（`COPY` の順番）を疑います。

## オフライン開発

`.dev.vars` に `GEMINI_FAKE=1` を入れると、Gemini を呼ばずフェイク応答を返します（`src/server/lib/gemini-fake.ts`）。API キー無し・ネットワーク無しで一連の流れを試せます。
GitHub API だけは本物を使います（メモの保存先そのものなので）。

## 関連
- 設計: `docs/design-docs/06-cicd-pipeline.md`、[ADR-0007](../design-docs/adr/0007-docker-for-local-dev.md)、[ADR-0008](../design-docs/adr/0008-run-ci-inside-dev-image.md)
- 手順: `docs/dev/setup.md`
