import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const variableName = "BRAND_AGENT_PROVIDER";
const backendDirectory = resolve(
  import.meta.dirname,
  "../../../packages/backend",
);

function convexEnv(args: string[]) {
  return execFileSync("pnpm", ["exec", "convex", "env", ...args], {
    cwd: backendDirectory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export default function useControlledBrandAgent() {
  const configuredVariables = new Set(
    convexEnv(["list", "--names-only"])
      .split("\n")
      .map((name) => name.trim()),
  );
  const previousValue = configuredVariables.has(variableName)
    ? convexEnv(["get", variableName])
    : null;

  convexEnv(["set", variableName, "controlled"]);

  return () => {
    if (previousValue === null) {
      convexEnv(["remove", variableName]);
      return;
    }
    convexEnv(["set", variableName, previousValue]);
  };
}
