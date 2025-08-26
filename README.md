# TaskAgent
日々の習慣化を促進するWebアプリ

時間管理を担ってくれる。
Googleカレンダーのような表形式でなく、円グラフで視覚的効果の得やすいWebサービス

- 基本習慣の登録・通知
- 1日の習慣のカスタマイズ
- 1日の振り返り（感謝ノート・ジャーナリング）


## 構築

[Node.jsの公式サイト](https://nodejs.org/ja/download "Nodejs.org")にアクセスし、最新のLTSをインストール

インストール完了後、以下入力

    node -v

Next.jsをいれる準備する

    npm install -g npm@11.5.2

以降はNext.jsのGetting Startedに沿って構築

    npx create-next-app@latest task-agent --yes
    cd task-agent
    npm run dev

