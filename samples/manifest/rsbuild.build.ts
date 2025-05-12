import type { RsbuildConfig } from "@rsbuild/core";

const config: RsbuildConfig = {
    mode: "production",
    source: {
        entry: {
            index: "./src/index.ts"
        }
    },
    output: {
        target: "web",
        manifest: true,
        distPath: {
            root: "./dist",
            js: ""
        },
        cleanDistPath: true,
        minify: true
    }
};

export default config;
