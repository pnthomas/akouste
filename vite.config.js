import { defineConfig } from "vite";

/** GitHub Actions sets GITHUB_REPOSITORY=owner/repo for Pages builds. */
function githubPagesBase() {
  const full = process.env.GITHUB_REPOSITORY;
  if (!full) return "/";
  const name = full.split("/")[1];
  if (!name) return "/";
  if (name.endsWith(".github.io")) return "/";
  return `/${name}/`;
}

export default defineConfig({
  base: githubPagesBase(),
  publicDir: "public",
});
