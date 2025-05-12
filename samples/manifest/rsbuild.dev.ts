import type { RsbuildConfig } from "@rsbuild/core";

const config: RsbuildConfig = {
    source: {
        entry: {
            index: "./src/index.ts"
        }
    },
    output: {
        target: "web",
        manifest: true,
        distPath: {
            root: "./dist/app",
            js: ""
        }
    }
};

export default config;
