import { defineMonorepoWorkspaceConfig } from "@workleap/eslint-configs";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
    globalIgnores([
        "lib",
        "samples",
        "docs"
    ]),
    defineMonorepoWorkspaceConfig(import.meta.dirname)
]);
