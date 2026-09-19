# ADR-0008: CI とデプロイを開発と同じ Docker イメージの中で実行する

- 状態: Accepted
- 日付: 2026-09-19
- 関連: ADR-0007

## 文脈
v0.2 までの CI は GitHub Actions の runner 上で `setup-node` + pnpm を使い、4 ジョブを並列実行していた。
ローカルを Docker に移した（ADR-0007）結果、**ローカルと CI で環境が別物**になり、環境差が CI をすり抜ける余地が残った。

## 決定
CI とデプロイを、`Dockerfile` の `ci` ステージ（`dev` と同じ `base`/`deps` を共有）の中で実行する。

- `ci.yml`: イメージをビルド → `docker run … pnpm verify` の 1 ジョブ
- `deploy.yml`: 同じイメージで `pnpm verify` → `pnpm db:migrate:remote` → `pnpm cf:deploy`
- レイヤは GitHub Actions のキャッシュ（`type=gha`）に載せる

副次的に、**`Dockerfile` 自体が毎 PR で検証される**（壊れたら CI が赤くなる）。

## 代替案
- **runner に直接（従来）**: 速く並列化しやすいが、環境一致を捨てることになる。
- **GHCR に push して各ジョブで `container:` を使う**: 並列化と環境一致を両立できるが、レジストリ権限と初回の鶏と卵問題が増える。ジョブ数が増えたらここへ移行する。

## 結果
- 良い: ローカルの `pnpm docker:verify` と CI が同じコマンド・同じイメージ。デプロイされるのは検証したのと同じ成果物。
- 悪い: 並列化を捨てたので CI の所要時間が伸びる（およそ 1 分 → 2〜3 分）。この規模では許容する。
- 注意: Docker Hub の匿名 pull レート制限に当たる可能性がある。頻発したら `docker/login-action` を足す。
