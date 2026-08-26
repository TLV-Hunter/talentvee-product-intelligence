import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/talentvee-product-intelligence/",
  publicDir: false,
  plugins: [react()],
  define: {
    __TALENTVEE_STATIC__: JSON.stringify(true),
  },
  build: {
    outDir: "../../docs",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/app.[ext]",
      },
    },
  },
});
