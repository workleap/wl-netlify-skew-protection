import { config, createSkewProtectionFunction } from "@workleap/netlify-skew-protection";

const fct = createSkewProtectionFunction("spa", { verbose: true });

export { config, fct as default };
