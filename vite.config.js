import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 4317, strictPort: true },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome110",
    assetsDir: "assets",
  },
  envPrefix: "VITE_",
});
