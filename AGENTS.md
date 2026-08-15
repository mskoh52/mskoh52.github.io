# Project Guide

## Architecture

This is a framework-free static project. `scripts/build.mjs` is the only build entry point. It reads `sites.config.json`, builds each application inside its git submodule directory, installs dependencies when a recognized package manifest is present, and copies each build output directory into `public/<slug>`.

The same script renders `src/index.html` into `public/index.html`. It replaces the application card placeholder based on build results. `src/styles.css` contains all visual styling and is copied to the publish directory.

## Key paths

- `.gitmodules`: application sources, one submodule per app
- `scripts/build.mjs`: app builds, output copying, and index rendering
- `sites.config.json`: app labels, descriptions, slugs, submodule paths, and command overrides
- `src/index.html`: landing-page template
- `src/styles.css`: landing-page styles
- `public/`: generated output; never edit or commit it

## Conventions

- Keep the project dependency-free unless a concrete requirement justifies a package.
- Use HTTPS submodule URLs so CI checkouts work without credentials.
- Use lowercase, hyphenated slugs because they become public URL paths.
- Preserve accessible focus states, semantic HTML, responsive layouts, and reduced-motion support when editing the landing page.
- Treat each submodule's build output directory as immutable and copy it in full.

## Non-obvious decisions

The hub completes successfully when a submodule is uninitialized so a fresh clone shows clear setup cards instead of failing with an empty site. Once a submodule is populated, a failed app build or a missing entry file fails the deployment to avoid publishing stale or incomplete content.

Builds run inside the submodule working tree. Each application's `.gitignore` covers its output directory, so builds leave the submodule clean.
