import { defineConfig, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";

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
