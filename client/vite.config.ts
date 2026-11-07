import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
export default defineConfig({
  plugins: [
    vue({ template: { transformAssetUrls: { includeAbsolute: false } } }),
  ],
  publicDir: false,
  build: {
    outDir: "../sites/agl/vue-dist",
    emptyOutDir: true,
    assetsDir: "app-assets",
    rollupOptions: {
      output: {
        manualChunks: {
          identity: ["oidc-client-ts"],
          markdown: ["marked", "dompurify"],
        },
      },
    },
  },
});
