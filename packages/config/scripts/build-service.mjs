// Baut einen Node-Dienst (realtime, worker, cron) zu einer Datei.
// Workspace-Pakete (@app/*) werden eingebunden, alles andere bleibt extern.
import { build } from "esbuild";

export async function buildService({ entry = "src/index.ts", outfile = "dist/index.js" } = {}) {
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
          pluginBuild.onResolve({ filter: /^[^./]/ }, (args) =>
            args.path.startsWith("@app/") ? undefined : { path: args.path, external: true },
          );
        },
      },
    ],
  });
}
