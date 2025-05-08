import { config, createSkewProtectionFunction } from "@workleap/netlify-skew-protection";

const fct = createSkewProtectionFunction(["/", "/index.html"], {
    debug: true
});

export { config, fct as default };
