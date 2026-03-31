import { defineConfig, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "child_process";

function gitVersion() {
  try {
    const hash = execSync("git rev-parse --short HEAD").toString().trim();
    const date = execSync("git log -1 --format=%cd --date=short").toString().trim();
    return `${date} (${hash})`;
  } catch {
    return "dev";
  }
}

// Treat .js files containing JSX the same as .jsx files.
// This matches CRA / other MERN toolchain behavior.
function jsxInJsPlugin() {
  return {
    name: "treat-js-as-jsx",
    async transform(code, id) {
      if (!/src\/.*\.js$/.test(id)) return null;
      return transformWithEsbuild(code, id + ".jsx", {
        loader: "jsx",
        jsx: "automatic",
      });
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(gitVersion()),
  },
  plugins: [jsxInJsPlugin(), react()],
  optimizeDeps: {
    esbuildOptions: {
      loader: { ".js": "jsx" },
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:4000",
      "/uploads": "http://localhost:4000",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
});
