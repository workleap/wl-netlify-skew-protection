import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        exclude: ["node_modules", "dist"],
        reporters: "verbose",
        setupFiles: ["./tests/setup.ts"]
    },
    cacheDir: "./node_modules/.cache/vitest"
});
