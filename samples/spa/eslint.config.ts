import { defineWebApplicationConfig } from "@workleap/eslint-configs";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
    globalIgnores([
        ".netlify"
    ]),
    defineWebApplicationConfig(import.meta.dirname)
]);
