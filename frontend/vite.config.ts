/// <reference types="vitest/config" />
import fs from "fs";
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Copy index.html → 404.html so GitHub Pages serves the SPA on deep links. */
function spaFallback404() {
  return {
    name: "spa-fallback-404",
    closeBundle() {
      const dist = path.resolve(__dirname, "dist");
      const indexHtml = path.join(dist, "index.html");
      const notFoundHtml = path.join(dist, "404.html");
      if (fs.existsSync(indexHtml)) {
        fs.copyFileSync(indexHtml, notFoundHtml);
      }
    },
  };
}

export default defineConfig(({ command, isPreview }) => ({
  // Production builds (and preview of those builds) are hosted under /slyvr/.
  // Local `vite` keep the default root base so DX stays at the normal Vite URL.
  base: command === "build" || isPreview === true ? "/slyvr/" : "/",
  plugins: [react(), tailwindcss(), spaFallback404()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
}));
