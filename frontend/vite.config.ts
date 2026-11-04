import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

const appVersion = JSON.parse(readFileSync(path.resolve(frontendRoot, "package.json"), "utf8")).version as string;

const hashTree = (dir: string, hash: ReturnType<typeof createHash>) => {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      hashTree(full, hash);
      continue;
    }
    hash.update(path.relative(frontendRoot, full));
    hash.update(readFileSync(full));
  }
};

const buildHash = createHash("sha256");
buildHash.update(appVersion);
hashTree(path.join(frontendRoot, "src"), buildHash);
hashTree(path.join(frontendRoot, "public"), buildHash);
buildHash.update(readFileSync(path.join(frontendRoot, "index.html")));
const buildId = buildHash.digest("hex").slice(0, 16);

const versionBody = JSON.stringify({ version: appVersion, build: buildId });

const versionFile = (): Plugin => ({
  name: "app-version",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split("?")[0];
      if (url !== "/version.json") {
        next();
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(versionBody);
    });
  },
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "version.json",
      source: versionBody,
    });
  },
});

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [react(), versionFile()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    },
  },
  server: {
    proxy: {
      '/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
      '/swagger-ui': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/v3': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
