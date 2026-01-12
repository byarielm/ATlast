import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  base: "/",
  plugins: [react(), svgr()],
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@icons-pack/react-simple-icons",
      "lucide-react",
      "date-fns",
      "jszip",
      "zustand",
      "@tanstack/react-virtual",
    ],
  },
  server: {
    port: 5175,
    strictPort: true, // Don't auto-increment port if in use
    fs: {
      // Allow serving files from the monorepo root
      allow: ["../.."],
    },
  },
});
