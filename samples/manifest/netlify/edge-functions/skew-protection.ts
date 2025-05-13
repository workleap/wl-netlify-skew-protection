import { config, createSkewProtectionFunction } from "@workleap/netlify-skew-protection";

const fct = createSkewProtectionFunction("entrypoints", {
    entrypoints: ["/"],
    verbose: true
});

export { config, fct as default };
