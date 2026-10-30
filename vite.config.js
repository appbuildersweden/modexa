import { defineConfig } from "vite";
import pkg from "./package.json";

export default defineConfig({
  /* one version for the whole app: bump package.json and every other manifest follows */
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 4317, strictPort: true },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome110",
    assetsDir: "assets",
  },
  envPrefix: "VITE_",
});
