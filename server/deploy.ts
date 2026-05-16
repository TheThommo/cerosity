import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type DeployManifest = {
  builtAt: string;
  commit: string;
  clientEntry: string | null;
  hasDarkTheme?: boolean;
};

export function readDeployManifest(): DeployManifest | null {
  const manifestPath = path.resolve(__dirname, "public", "deploy.json");
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as DeployManifest;
  } catch {
    return null;
  }
}
