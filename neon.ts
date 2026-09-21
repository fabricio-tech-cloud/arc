import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  preview: {
    // Upgrade to a paid plan to enable AI Gateway for your project.
    // aiGateway: true,
    buckets: {
      "user-images": { access: "public_read" },
      uploads: { access: "public_read" },
    },
    functions: {
      api: { name: "api", source: "./hello.ts" },
    },
  },
});
