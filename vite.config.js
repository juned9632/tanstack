import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const basePlugins = [
  TanStackRouterVite({ autoCodeSplitting: true }),
  viteReact(),
  tailwindcss(),
  viteTsConfigPaths(), // ✅ moved here
];

if (process.env.SENTRY_AUTH_TOKEN) {
  basePlugins.push(
    sentryVitePlugin({
      org: "org-name",
      project: "project-name",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    })
  );
}

export default defineConfig({
  plugins: basePlugins,
  build: {
    sourcemap: !!process.env.SENTRY_AUTH_TOKEN,
  },
});
