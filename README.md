# Static App Hub

A small static index that builds the static web apps vendored as git submodules and presents them from one shared index page. Each submodule's build script is run in place, and its complete `dist` directory is published under a dedicated path.

## Technologies

- Node.js 22 build script
- Static HTML and CSS
- Git submodules as application sources

## Configure the applications

The entries live in `sites.config.json`. Each entry describes one submodule:

| Field | Required | Purpose |
| --- | --- | --- |
| `name` | Yes | Card title |
| `slug` | Yes | Published URL path under `/` |
| `path` | No | Submodule directory; defaults to `slug` |
| `description` | No | Card body text |
| `installCommand` | No | Overrides automatic dependency installation |
| `buildCommand` | No | Overrides the default `node build.js` command |
| `distDirectory` | No | Build output directory; defaults to `dist` |
| `indexFile` | No | Entry file inside the output, renamed to `index.html` when published; defaults to `index.html` |

Adding an application:

```bash
git submodule add https://github.com/organization/repository.git repository
```

Then add a matching entry to `sites.config.json`.

Each application must generate an entry file inside its output directory. Any additional files inside that directory are copied with it. Application asset URLs should be relative or configured for the application's published slug.

## Run locally

```bash
npm run apps:init
npm run build
```

`npm run apps:update` fetches the latest upstream commit for every submodule. Commit the resulting submodule pointers to deploy those versions.

Open `public/index.html` through any static file server, or run `npm run serve:build`. If a submodule is not initialized, the build still creates the hub and displays setup instructions in place of that application's link.

## Deployment

`.github/workflows/pages.yml` checks out the repository with `submodules: recursive`, runs `npm run build`, and publishes `public/` to GitHub Pages. Deployments use the submodule commits recorded on `main`, so updating an application requires committing its new submodule pointer here.
