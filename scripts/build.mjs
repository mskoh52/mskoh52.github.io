import { cp, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { loadPackageEnv } from "./load-env.mjs";

loadPackageEnv(process.env.TARGET || "local");

const projectRoot = process.cwd();
const outputDirectory = path.join(projectRoot, "public");
const configPath = path.join(projectRoot, "sites.config.json");
const sourceDirectory = path.join(projectRoot, "src");

function run(command, options = {}) {
  const result = spawnSync(command, {
    cwd: options.cwd ?? projectRoot,
    env: process.env,
    shell: true,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command}`);
  }
}

async function hasDependencies(appDirectory) {
  const manifestPath = path.join(appDirectory, "package.json");
  if (!existsSync(manifestPath)) return false;
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  return Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).length > 0;
}

async function resolveInstallCommand(appDirectory, configuredCommand) {
  if (configuredCommand) return configuredCommand;
  if (!(await hasDependencies(appDirectory))) return null;
  if (existsSync(path.join(appDirectory, "pnpm-lock.yaml"))) return "corepack pnpm install --frozen-lockfile";
  if (existsSync(path.join(appDirectory, "yarn.lock"))) return "corepack yarn install --immutable";
  if (existsSync(path.join(appDirectory, "package-lock.json"))) return "npm ci";
  return "npm install";
}

function validateConfig(apps) {
  const slugs = new Set();

  for (const app of apps) {
    if (!app.name || !app.slug) {
      throw new Error("Every site needs name and slug values.");
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(app.slug)) {
      throw new Error(`Invalid slug '${app.slug}'. Use lowercase letters, numbers, and hyphens.`);
    }
    if (slugs.has(app.slug)) throw new Error(`Duplicate slug '${app.slug}'.`);
    slugs.add(app.slug);
  }
}

async function isInitializedSubmodule(appDirectory) {
  if (!existsSync(appDirectory)) return false;
  const entries = await readdir(appDirectory);
  return entries.length > 0;
}

async function buildApp(app) {
  const submodulePath = app.path ?? app.slug;
  const appDirectory = path.join(projectRoot, submodulePath);

  if (!(await isInitializedSubmodule(appDirectory))) {
    return { ...app, submodulePath, configured: false };
  }

  console.log(`\nBuilding ${app.name}`);

  const installCommand = await resolveInstallCommand(appDirectory, app.installCommand);
  if (installCommand) run(installCommand, { cwd: appDirectory });

  run(app.buildCommand ?? "node build.js", { cwd: appDirectory });

  const appDistDirectory = path.join(appDirectory, app.distDirectory ?? "dist");
  const appIndexPath = path.join(appDistDirectory, app.indexFile ?? "index.html");
  if (!existsSync(appIndexPath)) {
    throw new Error(`${app.name} did not produce ${path.relative(appDirectory, appIndexPath)}.`);
  }

  const publishDirectory = path.join(outputDirectory, app.slug);
  await cp(appDistDirectory, publishDirectory, { recursive: true });

  if (app.indexFile && app.indexFile !== "index.html") {
    await rename(path.join(publishDirectory, app.indexFile), path.join(publishDirectory, "index.html"));
  }

  return { ...app, submodulePath, configured: true };
}

function renderCard(app, index) {
  const number = String(index + 1).padStart(2, "0");
  if (!app.configured) {
    return `
      <article class="app-card app-card--disabled" aria-label="${app.name} is not configured">
        <div class="app-card__number">${number}</div>
        <div class="app-card__content">
          <p class="app-card__status">Configuration needed</p>
          <h2>${app.name}</h2>
          <p>${app.description ?? "Static web application."}</p>
          <span class="app-card__action">Run git submodule update --init ${app.submodulePath}</span>
        </div>
      </article>`;
  }

  return `
      <a class="app-card" href="${app.slug}/">
        <div class="app-card__number">${number}</div>
        <div class="app-card__content">
          <p class="app-card__status"><span></span> Ready to open</p>
          <h2>${app.name}</h2>
          <p>${app.description ?? "Static web application."}</p>
          <span class="app-card__action">Launch application <b aria-hidden="true">↗</b></span>
        </div>
      </a>`;
}

async function renderIndex(apps) {
  const template = await readFile(path.join(sourceDirectory, "index.html"), "utf8");
  const html = template
    .replace("{{APP_CARDS}}", apps.map(renderCard).join("\n"))

  await writeFile(path.join(outputDirectory, "index.html"), html);
  await cp(path.join(sourceDirectory, "styles.css"), path.join(outputDirectory, "styles.css"));
}

async function main() {
  const apps = JSON.parse(await readFile(configPath, "utf8"));
  validateConfig(apps);

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  const builtApps = [];
  for (const app of apps) builtApps.push(await buildApp(app));
  await renderIndex(builtApps);
  console.log(`\nPublished ${builtApps.filter((app) => app.configured).length} application(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
