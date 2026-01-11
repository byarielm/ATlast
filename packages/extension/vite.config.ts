import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: "src/popup",
  base: "./",
  build: {
    outDir: "../../dist/popup-preview",
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    open: "/popup.html",
  },
  define: {
    __ATLAST_API_URL__: JSON.stringify("http://localhost:8888"),
    __BUILD_MODE__: JSON.stringify("development"),
  },
  resolve: {
    alias: {
      // Mock webextension-polyfill for dev server
      "webextension-polyfill": resolve(
        __dirname,
        "src/popup/mocks/browser-mock.ts",
      ),
    },
  },
});
