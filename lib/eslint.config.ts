import { defineTypeScriptLibraryConfig } from "@workleap/eslint-configs";
import { defineConfig } from "eslint/config";

export default defineConfig([
    {
        files: ["src/**/js/*"],
        rules: {
            "no-restricted-imports":
                ["error",
                    {
                        "name": "react",
                        "message": "Importing \"react\" is not allowed in the 'js' folder. Please use framework-agnostic code instead."
                    },
                    {
                        "name": "react-dom",
                        "message": "Importing \"react-dom\" is not allowed in the 'js' folder. Please use framework-agnostic code instead."
                    }
                ]
        }
    },
    defineTypeScriptLibraryConfig(import.meta.dirname)
]);
