import { defineConfig } from "@rslib/core";

export default defineConfig({
    lib: [{
        format: "esm",
        autoExternal: false
    }],
    source: {
        entry: {
            "skew-protection": "./netlify/edge-functions/skew-protection.ts"
        }
    },
    output: {
        distPath: {
            root: "./dist/netlify/edge-functions",
            js: ""
        },
        filename: {
            js: "[name].js"
        }
    }
});
