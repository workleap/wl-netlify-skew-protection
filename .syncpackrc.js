// @ts-check

/** @type {import("syncpack").RcFile} */
export default {
    "lintFormatting": false,
    "dependencyTypes": ["prod", "dev"],
    "semverGroups": [
        {
            "packages": ["@workleap/netlify-skew-protection"],
            "dependencyTypes": ["prod", "peer"],
            "range": "^",
            "label": "Lib should use ^ for dependencies and peerDependencies."
        },
        {
            "packages": ["@workleap/netlify-skew-protection"],
            "dependencyTypes": ["dev"],
            "range": "",
            "label": "Lib should pin devDependencies."
        },
        {
            "packages": ["@samples/*"],
            "dependencyTypes": ["prod", "dev"],
            "range": "",
            "label": "Sample should pin dependencies and devDependencies."
        },
        {
            "packages": ["workspace-root"],
            "dependencyTypes": ["dev"],
            "range": "",
            "label": "Workspace root should pin devDependencies."
        },
    ],
    "versionGroups": [
        {
            "packages": ["**"],
            "dependencyTypes": ["prod", "dev"],
            "preferVersion": "highestSemver",
            "label": "Lib and Sample should have a single version across the repository."
        }
    ]
};
