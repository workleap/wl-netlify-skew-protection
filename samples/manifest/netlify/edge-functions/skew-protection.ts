import { config, createSkewProtectionFunction } from "@workleap/netlify-skew-protection";

const fct = createSkewProtectionFunction("entrypoints", {
    entrypoints: ["/", "/manifest.json"],
    verbose: true
});

export { config, fct as default };
