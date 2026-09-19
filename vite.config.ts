import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  build: { sourcemap: false },
  server: {
    // コンテナ内で 0.0.0.0 を待ち受けないと、ホストからポート転送で届かない
    host: true,
    port: 5173,
    strictPort: true,
    // macOS / Windows のバインドマウントは inotify が届かないことがある。
    // HMR が効かないときだけ VITE_USE_POLLING=1 で切り替える（常時有効にすると CPU を食う）
    ...(process.env.VITE_USE_POLLING === "1" ? { watch: { usePolling: true, interval: 300 } } : {}),
  },
});
