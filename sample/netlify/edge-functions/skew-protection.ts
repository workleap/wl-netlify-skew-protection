import { config, createSkewProtectionFunction } from "@workleap/netlify-skew-protection";

const fct = createSkewProtectionFunction({ debug: true });

export { config, fct as default };
