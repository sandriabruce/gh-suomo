import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const cssCacheVersion = "spicy-crimson-20260521";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    {
      name: "css-cache-bust",
      enforce: "post",
      transformIndexHtml(html) {
        return html.replace(/(href="[^"]+\.css)(?=")/g, `$1?v=${cssCacheVersion}`);
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
});
