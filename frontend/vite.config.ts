import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/zrender/")) return "render-engine";
          if (id.includes("/node_modules/echarts/")) return "analysis-charts";
        },
      },
    },
  },
  server: { proxy: { "/api": "http://127.0.0.1:8080" } },
});
