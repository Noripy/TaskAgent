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

以降はNext.jsのGetting Startedに沿って構築する

    npx create-next-app@latest task-agent --yes
    cd task-agent
    npm run dev

テストツールとして、Vitestを導入する

 [Next.jsにVitest導入](https://nextjs.org/docs/app/guides/testing/vitest "How to set up Vitest with Next.js")を参考に以下実行

（※Viteは、Next.jsの競合フレームワークなので必要なし）

    npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths

vitest.config.mtsを以下の通り修正する

```TypeScript:vitest.config.mts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
 
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
  },
})
```

package.jsonにVitest用のコマンドを追記する

```JSON:package.json
{

  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --turbopack",
    "start": "next start",
    "test": "vitest"
  }
}
```

app/page.tsxにh1タグでHomeを追記する。プロジェクトフォルダ直下にtestフォルダを作成した後、テストコード用のtsxを作成する

```TypeScript:page.test.tsx
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from '../app/page'
 
test('Page', () => {
  render(<Page />)
  expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeDefined()
})
```

ターミナルでテストを実行する。PASSと表示されればテストコードの内容がクリアされたことになる

    npm run test


