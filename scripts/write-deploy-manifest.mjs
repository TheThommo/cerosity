import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const publicDir = join(process.cwd(), "dist/public");
const indexHtml = readFileSync(join(publicDir, "index.html"), "utf8");
const jsMatch = indexHtml.match(/\/assets\/(index-[^"]+\.js)/);
const clientEntry = jsMatch?.[1] ?? null;

const assetsDir = join(publicDir, "assets");
const hasDarkTheme = readdirSync(assetsDir)
  .filter((name) => name.startsWith("index-") && name.endsWith(".js"))
  .some((name) => {
    const content = readFileSync(join(assetsDir, name), "utf8");
    return content.includes("030712") || content.includes("0a0a0f");
  });

writeFileSync(
  join(publicDir, "deploy.json"),
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      commit:
        process.env.RAILWAY_GIT_COMMIT_SHA ||
        process.env.GITHUB_SHA ||
        "local",
      clientEntry,
      hasDarkTheme,
    },
    null,
    2,
  ),
);

console.log(
  `[deploy-manifest] commit=${process.env.RAILWAY_GIT_COMMIT_SHA || "local"} bundle=${clientEntry} darkTheme=${hasDarkTheme}`,
);
