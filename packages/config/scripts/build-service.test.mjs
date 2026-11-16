import { describe, expect, it } from "vitest";
import { missingDependencies, packageName } from "./build-service.mjs";

describe("Abhängigkeiten eines Dienst-Bundles", () => {
  it("leitet den Paketnamen aus dem Import ab", () => {
    expect(packageName("zod")).toBe("zod");
    expect(packageName("better-auth/plugins")).toBe("better-auth");
    expect(packageName("@prisma/client/runtime")).toBe("@prisma/client");
  });

  it("meldet externe Importe, die nicht deklariert sind, und ignoriert Node-Module", () => {
    const manifest = { dependencies: { ws: "1", ioredis: "1" } };
    expect(missingDependencies(["ws", "ioredis", "node:crypto", "fs", "zod", "better-auth/api"], manifest)).toEqual(["better-auth", "zod"]);
  });
});
