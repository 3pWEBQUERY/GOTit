// Baut einen Node-Dienst (realtime, worker, cron) zu einer Datei.
// Workspace-Pakete (@app/*) werden eingebunden, alles andere bleibt extern.
// Danach prüft der Build, dass jede externe Abhängigkeit in package.json des
// Dienstes steht: pnpm installiert streng, eine fehlende Angabe fiele sonst
// erst beim Start auf Railway auf.
import { readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { build } from "esbuild";

const builtins = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));

/** Paketname eines Imports: `@scope/name/sub` → `@scope/name`, `name/sub` → `name`. */
export function packageName(specifier) {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

export function missingDependencies(externals, manifest) {
  const declared = new Set(Object.keys(manifest.dependencies ?? {}));
  return [...new Set(externals.filter((specifier) => !builtins.has(specifier)).map(packageName))]
    .filter((name) => !declared.has(name))
    .sort();
}

export async function buildService({ entry = "src/index.ts", outfile = "dist/index.js" } = {}) {
  const externals = new Set();
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: "node",
    target: "node22",
    format: "esm",
    sourcemap: true,
    plugins: [
      {
        name: "external-dependencies",
        setup(pluginBuild) {
          pluginBuild.onResolve({ filter: /^[^./]/ }, (args) => {
            if (args.path.startsWith("@app/")) return undefined;
            externals.add(args.path);
            return { path: args.path, external: true };
          });
        },
      },
    ],
  });
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  const missing = missingDependencies([...externals], manifest);
  if (missing.length > 0) {
    throw new Error(`${manifest.name} importiert Pakete, die nicht in seinen dependencies stehen: ${missing.join(", ")}`);
  }
}
