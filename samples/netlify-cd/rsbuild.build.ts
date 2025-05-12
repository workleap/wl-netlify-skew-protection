import { defineBuildConfig } from "@workleap/rsbuild-configs";

export default defineBuildConfig({
    assetPrefix: "auto",
    distPath: {
        root: "./dist/app",
        js: "",
        css: ""
    }
});
