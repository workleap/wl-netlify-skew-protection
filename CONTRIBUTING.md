# Contributing

The following documentation is only for the maintainers of this repository.

- [Monorepo setup](#monorepo-setup)
- [Project overview](#project-overview)
- [Installation](#installation)
- [Develop the library](#develop-the-library)
- [Release the package](#release-the-package)
- [Deploy the sample applications](#deploy-the-sample-applications)
- [Available commands](#commands)
- [CI](#ci)

## Monorepo setup

This repository is managed as a monorepo with [PNPM workspace](https://pnpm.io/workspaces) to handle the installation of the npm dependencies and manage the packages interdependencies.

It's important to note that PNPM workspace doesn't hoist the npm dependencies at the root of the workspace as most package manager does. Instead, it uses an advanced [symlinked node_modules structure](https://pnpm.io/symlinked-node-modules-structure). This means that you'll find a `node_modules` directory inside the packages folders as well as at the root of the repository.

The main difference to account for is that the `devDependencies` must now be installed locally in every package `package.json` file rather than in the root `package.json` file.

### Turborepo

This repository use [Turborepo](https://turbo.build/repo/docs) to execute it's commands. Turborepo help saving time with it's built-in cache but also ensure the packages topological order is respected when executing commands.

To be understand the relationships between the commands, have a look at this repository [turbo.json](./turbo.json) configuration file.

## Project overview

This project is split into two major sections, [lib/](lib/) and [samples/](samples/).

### Lib

Under [lib/](lib/) is the actual package for the Skew Protection Edge Function.

### Samples

Under [samples/](samples/) are applications to test the Skew Protection Edge Function functionalities while developing.

You'll find four samples:

- `spa`: A sample application showcasing the `spa` mode.
- `manifest`: A sample application showcasing the `entrypoints` mode.
- `cd`: A sample application testing that the proposed setup to deploy the Skew Protection with Netlify CD works as expected.

## Installation

This project uses PNPM, therefore, you must [install PNPM](https://pnpm.io/installation) first:

```bash
npm install -g pnpm
```

To install this project, open a terminal at the root of the project and execute the following command:

```bash
pnpm install
```

### Setup Retype

[Retype](https://retype.com/) is the documentation platform that the `@workleap/netlify-skew-protection` package is using for its documentation. As this project is leveraging a few [Pro features](https://retype.com/pro/) of Retype it is recommended to setup [Retype wallet](https://retype.com/guides/cli/#retype-wallet).

Everything should work fine without a wallet but there are a few limitations to use Retype Pro features without one. If you want to circumvent these limitations, you can optionally, setup your [Retype wallet](https://retype.com/guides/cli/#retype-wallet).

To do so, first make sure that you retrieve the Retype license from your Vault (or ask IT).

Then, open a terminal at the root of the project and execute the following command:

```bash
npx retype wallet --add <your-license-key-here>
```

## Release the package

When you are ready to release the package, you must follow the following steps:

1. Run `pnpm changeset` and follow the prompt. For versioning, always follow the [SemVer standard](https://semver.org/).
2. Commit the newly generated file in your branch and submit a new Pull Request (PR). Changesets will automatically detect the changes and post a message in your pull request telling you that once the PR closes, the versions will be released.
3. Find someone to review your PR.
4. Merge the Pull request into `main`. A GitHub action will automatically trigger and update the version of the packages and publish them to [npm](https://www.npmjs.com/). A tag will also be created on GitHub tagging your PR merge commit.

### Troubleshooting

#### Github

Make sure you're Git is clean (No pending changes).

#### NPM

Make sure GitHub Action has **write access** to the selected npm packages.

#### Compilation

If the packages failed to compile, it's easier to debug without executing the full release flow every time. To do so, instead, execute the following command:

```bash
pnpm build-lib
```

By default, the package compilation output will be in their respective *dist* directory.

#### Linting errors

If you got linting error, most of the time, they can be fixed automatically using `eslint . --fix`, if not, follow the report provided by `pnpm lint`.

## Deploy the sample applications

### The "spa" sample application

The site for the "spa" sample application is [hosted on Netlify](https://nf-skew-protection-spa-sample.netlify.app/).

To deploy the sample application, open a terminal at the root of the repository and execute the following script:

```bash
pnpm deploy-spa
```

### The "manifest" sample application

The site for the "manifest" sample application is [hosted on Netlify](https://nf-skew-protection-manifest-sample.netlify.app/).

To deploy the sample application, open a terminal at the root of the repository and execute the following script:

```bash
pnpm deploy-manifest
```

### The "netlify-cd" sample application

The site for the "manifest" sample application is [hosted on Netlify](https://nf-skew-protection-cd-sample.netlify.app/).

The site is automatically deployed whenever a PR is merged.

## Commands

From the project root, you have access to many commands. The most important ones are:

### dev-spa

Start a watch process for the "spa" sample application.

```bash
pnpm dev-spa
```

### dev-manifest

Start a watch process for the "manifest" sample application.

```bash
pnpm dev-manifest
```

#### build-lib

Build the library.

```bash
pnpm build-lib
```

### serve-spa

Build the sample "spa" sample application for deployment and start a local web server to serve the application.

```bash
pnpm serve-spa
```

### serve-manifest

Build the sample "manifest" sample application for deployment and start a local web server to serve the application.

```bash
pnpm serve-manifest
```

### deploy-spa

Deploy the "spa" sample application.

```bash
pnpm deploy-spa
```

### deploy-manifest

Deploy the "manifest" sample application.

```bash
pnpm deploy-manifest
```

#### lint

Lint the files (ESLint, StyleLint and TS types).

```bash
pnpm lint
```

### changeset

To use when you want to publish a new package version. Will display a prompt to fill in the information about your new release.

```bash
pnpm changeset
```

#### clean

Clean the shell packages and the sample application (delete `dist` folder, clear caches, etc..).

```bash
pnpm clean
```

#### reset

Reset the monorepo installation (delete `dist` folders, clear caches, delete `node_modules` folders, etc..).

```bash
pnpm reset
```

#### list-outdated-deps

Checks for outdated dependencies. For more information, view [PNPM documentation](https://pnpm.io/cli/outdated).

```bash
pnpm list-outdated-deps
```

#### update-outdated-deps

Update outdated dependencies to their latest version. For more information, view [PNPM documentation](https://pnpm.io/cli/update).

```bash
pnpm update-outdated-deps
```

## CI

We use [GitHub Actions](https://github.com/features/actions) for this repository.

You can find the configuration in the [.github/workflows](.github/workflows/) folder and the build results are available [here](https://github.com/workleap/wl-squide/actions).

We currently have 3 builds configured:

### Changesets

This action runs on a push on the `main` branch. If there is a file present in the `.changeset` folder, it will publish the new package version on npm.

### CI

This action will trigger when a commit is done in a PR to `main` or after a push to `main` and will run `build`, `lint-ci` and `test` commands on the source code.

### Retype

This action will trigger when a commit is done in a PR to `main` or after a push to `main`. The action will generate the documentation website into the `retype` branch. This repository [Github Pages](https://github.com/workleap/wl-web-configs/settings/pages) is configured to automatically deploy the website from the `retype` branch.

If you are having issue with the Retype license, make sure the `RETYPE_API_KEY` Github secret contains a valid Retype license.

### Netlify CD application deployment

Whenever a PR is opened, the [netlify-cd](./samples/netlify-cd/) sample will be automatically deployed to a preview environment. This deployment ensure that the Edge Function can be build and deployed by Netlify CD.
