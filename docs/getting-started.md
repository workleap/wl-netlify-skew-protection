---
order: 100
icon: rocket
---

# Getting started

Welcome to the Netlify Skew Protection package documentation, a library to seamlessly add a [Skew Protection](https://www.industrialempathy.com/posts/version-skew/) feature to your [Netlify](https://www.netlify.com/) site. On this page, you'll discover how this package can help avoir version skew and learn how to set it up.

## Problem

When deploying a new version of a static site, users who are still browsing the previous version may encounter `404` errors for static assets like JavaScript or CSS files. This happens because the new deployment instantly replaces the old one at the entry point, but users' files still references asset filenames that were unique to the previous build. As a result, when a user navigates to a page during this transition, the browser requests files may no longer exist, leading to broken pages and degraded user experience.

At Workleap, version skew most commonly occurs with [lazy-loaded routes](https://react.dev/reference/react/lazy).

## Solution

Skew Protection addresses this by maintaining a consistent experience for each user session. It does so by assigning a cookie when a user first fetch the entry point, tying that session to a specific deployment id. All subsequent asset requests are routed to that specific deploy URL (e.g., https://deploy-id--your-site.netlify.app), ensuring that users always receive the correct asset versions associated with the entry point they were served. This prevents asset mismatches and eliminates `404` errors caused by mid-session deploy transitions, resulting in smoother, safer releases.

## Set up Skew Protection

Let's [create an edge function](#create-the-edge-function), then [register the edge function](#register-the-edge-function), [build the edge function](#build-the-edge-function), and finally [configure the Netlify site](#configure-the-netlify-site).

### Create the edge function

First, open a terminal at the root of the web application project that will include the Netlify [edge function](https://docs.netlify.com/edge-functions/overview/) and install the following packages:

+++ pnpm
```bash
pnpm add -D @workleap/netlify-skew-protection
```
+++ yarn
```bash
yarn add -D @workleap/netlify-skew-protection
```
+++ npm
```bash
npm install -D @workleap/netlify-skew-protection
```
+++

!!!warning
While you can use any package manager to develop an application with Squide, it is highly recommended that you use PNPM as the guides has been developed and tested with PNPM.
!!!

Then, create the edge function under a `netlify` folder and name the file `skew-protection.ts` (yes the file will be in TypeScript):

``` !#2-3
web-project
├── netlify
├──── skew-protection.ts
├── package.json
```

Finally, open the `skew-protection.ts` file and paste the following content:

```ts skew-protection.ts
import { config, createSkewProtectionFunction } from "@workleap/netlify-skew-protection";

const fct = createSkewProtectionFunction(["/", "/index.html"]);

export { config, fct as default };
```

!!!info
The previous code :point_up: assumes that the application entry point is a `index.html` file. If the application entry point is different, make sure to replace `/index.html` for the actual entry point of the application.
!!!

### Register the edge function

Now, let's register the edge function with Netlify.

If the application doesn't have a `netlify.toml` file yet, create a new one at the root of the project:

``` !#4
web-project
├── netlify
├──── skew-protection.ts
├── netlify.toml
├── package.json
```

Open the `netlify.toml` file and register the edge-function by pasting the following content:

``` netlify.toml
[build]
    edge_functions = "web-project/netlify/edge-functions"

[[edge_functions]]
    path = "/*"
    function = "skew-protection"
```

### Build the edge function

Finally, depending of how the application is deployed to a Netlify site, additional steps might be required.

#### From Netlify CLI

If the application is deployed to it's Netlify site using the [Netlify CLI](https://docs.netlify.com/cli/get-started/), your good to go, no additional steps are required.

#### From Netlify CD

If the application is deployed to it's Netlify site with the Netlify CD, you might hit a [limitation](https://developers.netlify.com/sdk/edge-functions/get-started#limitations) with the imports of an NPM package in a Netlify edge function. The solution is to either build the edge function manually using [Rslib](#rslib) or importing the NPM package through the intermediate of [esm.sh](#esmsh). 

##### Rslib

First, open a terminal at the root of the web application project that will include the Netlify [edge function](https://docs.netlify.com/edge-functions/overview/) and install the following packages:

+++ pnpm
```bash
pnpm add -D @rslib/core
```
+++ yarn
```bash
yarn add -D @rslib/core
```
+++ npm
```bash
npm install -D @rslib/core
```
+++

!!!warning
While you can use any package manager to develop an application with Squide, it is highly recommended that you use PNPM as the guides has been developed and tested with PNPM.
!!!

Then, create a `rslib.edge-functions.ts` file at the root of the project:

``` !#5
web-project
├── netlify
├──── skew-protection.ts
├── netlify.toml
├── rslib.edge-functions.ts
├── package.json
```

Open the `rslib.edge-functions.ts` file and paste the following content:

```ts rslib.edge-functions.ts
import { defineConfig } from "@rslib/core";

export default defineConfig({
    lib: [{
        format: "esm",
        autoExternal: false
    }],
    source: {
        entry: {
            "skew-protection": "./netlify/edge-functions/skew-protection.ts"
        }
    },
    output: {
        distPath: {
            root: "./dist/netlify/edge-functions",
            js: ""
        },
        filename: {
            js: "[name].js"
        }
    }
});
```

Next, open the `netlify.toml` created earlier and update the `build.edge_functions` property to match the `dist` path of the rslib configuration file:

```!#2 netlify.toml
[build]
    edge_functions = "web-project/dist/netlify/edge-functions"

[[edge_functions]]
    path = "/*"
    function = "skew-protection"
```

Finally, update the build script of the project to build the edge functions as well:

```json !#4 package.json
"scripts": {
    "build": "pnpm run --sequential \"/^build:.*/\"",
    "build:cdn": "rsbuild build --config rsbuild.build.ts",
    "build:edge-functions": "rslib build --config rslib.edge-functions.ts"
}
```

##### esm.sh

Importing the NPM package with [esm.sh](https://esm.sh/) is more straightforward but involves an additional third party. To import the [@workleap/netlify-skew-protection](https://www.npmjs.com/package/@workleap/netlify-skew-protection) package using `esm.sh`, import the package of the package for the following code:

```ts skew-protection.ts
import { config, createSkewProtectionFunction } from "https://esm.sh/@workleap/netlify-skew-protection";
```

Since the package is downloaded from a third party server rather than being imported from a `node_modules` folder, the `@workleap/netlify-skew-protection` dependency can be removed from the project `package.json`.

!!!info
The previous example :point_up: always import the latest version of the package. [esm.sh](https://esm.sh/) also support specifying a specific version of the package if needed.
!!!

### Configure the Netlify site

Now, generate a new secret using the [OpenSSL CLI](https://docs.openssl.org/3.4/man1/openssl/):

```bash
openssl rand -base64 32
```

Save the generated value and to go the application [Netlify site](https://app.netlify.com/). Add a new environment variabled named `SKEW_PROTECTION_SECRET` and set the generated secret as the value.

## Try it :rocket:

To test your new set up, follow these steps:

1. Open a browser with the [Dev Tools](https://developer.chrome.com/docs/devtools) opened to the network tab and navigate to your application.

2. Search for the entry point file of the application and take a look at the response headers.

3. The response should include a `nf_sp` cookie (or wathever name you choose for the Skew Protection cookie)

4. Then, navigate to a lazy loaded route and refresh the page and find an asset request. The asset request should include a `nf_sp` cookie.

### Troubleshoot issues

- If the cookie is not set, troubleshoot the issue using Netlify [edge functions logs](https://docs.netlify.com/edge-functions/get-started/#monitor).

- If the logs mentions that the edge function is not installed properly, this is probably because the site doesn't include an `SKEW_PROTECTION_SECRET` environment variable. 

- If the requests to previous asset files are not re-routed, set the [debug](./available-options.md#debug) option, deploy the edge function again and troubleshoot the issue using the [edge functions logs](https://docs.netlify.com/edge-functions/get-started/#monitor).


