import { config, createSkewProtectionFunction } from "@workleap/netlify-skew-protection";

const fct = createSkewProtectionFunction("manifest", {
    entrypoints: [
        "manifest.json"
    ],
    verbose: true
});

export { config, fct as default };
