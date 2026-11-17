import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import postcss from "postcss";
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

/*
 * Two designs ship side by side. Every stylesheet under src/ is compiled twice: the current file scoped to
 * <html data-design="modern">, and its mirror under src/styles/classic/ scoped to data-design="classic".
 * Both halves stay at the file's original cascade position, the :where() scope adds no specificity,
 * and classic keyframes are renamed so the two sets cannot overwrite each other.
 */
const srcDir = path.join(frontendRoot, "src");
const classicDir = path.join(srcDir, "styles", "classic");
const CLASSIC_KEYFRAME_PREFIX = "classic--";

const listCss = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listCss(full);
    return entry.name.endsWith(".css") ? [full] : [];
  });

const inlineRelativeImports = (css: string, file: string, watch: (file: string) => void): string =>
  css.replace(/@import\s+['"](\.{1,2}\/[^'"]+)['"]\s*;/g, (_, rel: string) => {
    const target = path.resolve(path.dirname(file), rel);
    watch(target);
    return inlineRelativeImports(readFileSync(target, "utf8"), target, watch);
  });

const scopeSelector = (selector: string, attr: string): string => {
  const rootMatch = selector.match(/^(html|:root)(?=$|[\s.:#[>+~])/);
  if (rootMatch) {
    return `${rootMatch[1]}:where(${attr})${selector.slice(rootMatch[1].length)}`;
  }
  if (selector.startsWith("*") || selector.startsWith("::")) {
    const rest = selector.startsWith("*") ? selector.slice(1) : selector;
    return `:where(:root${attr}, :root${attr} *)${rest}`;
  }
  return `:where(:root${attr}) ${selector}`;
};

const scopeCss = (css: string, from: string, design: "modern" | "classic", classicKeyframes: Set<string>): string => {
  const attr = `[data-design="${design}"]`;
  const root = postcss.parse(css, { from });
  root.walkRules(rule => {
    const parent = rule.parent;
    if (parent?.type === "atrule" && /keyframes$/i.test((parent as postcss.AtRule).name)) return;
    if (parent?.type === "rule") return;
    rule.selectors = rule.selectors.map(selector => scopeSelector(selector.trim(), attr));
  });
  if (design === "classic") {
    root.walkAtRules(/keyframes$/i, atRule => {
      atRule.params = CLASSIC_KEYFRAME_PREFIX + atRule.params.trim();
    });
    root.walkDecls(/^animation(-name)?$/i, decl => {
      decl.value = decl.value.replace(/[\w-]+/g, word =>
        classicKeyframes.has(word) ? CLASSIC_KEYFRAME_PREFIX + word : word);
    });
  }
  return root.toString();
};

const designVariants = (): Plugin => {
  const classicKeyframes = new Set<string>();
  for (const file of listCss(classicDir)) {
    for (const match of readFileSync(file, "utf8").matchAll(/@keyframes\s+([\w-]+)/g)) {
      classicKeyframes.add(match[1]);
    }
  }

  return {
    name: "design-variants",
    enforce: "pre",
    transform(code, id) {
      const file = id.split("?")[0];
      if (!file.endsWith(".css") || !file.startsWith(srcDir + path.sep) || file.startsWith(classicDir + path.sep)) {
        return null;
      }
      const watch = (target: string) => this.addWatchFile(target);
      const modern = scopeCss(inlineRelativeImports(code, file, watch), file, "modern", classicKeyframes);
      const classicFile = path.join(classicDir, path.relative(srcDir, file));
      if (!existsSync(classicFile)) {
        return { code: modern, map: null };
      }
      watch(classicFile);
      const classicSource = inlineRelativeImports(readFileSync(classicFile, "utf8"), classicFile, watch);
      const classic = scopeCss(classicSource, classicFile, "classic", classicKeyframes);
      return { code: `${modern}\n${classic}`, map: null };
    },
  };
};

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [designVariants(), react(), versionFile()],
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
