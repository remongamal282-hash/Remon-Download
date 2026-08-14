import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts"
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  }
});
