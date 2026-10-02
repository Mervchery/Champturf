import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Plain `node` scripts don't auto-load .env.local the way `next dev`/
// `next build` do — that's a Next.js-specific convenience, not a Node
// one. Since the scraper runs as a standalone script (not through Next),
// it needs to load the file itself. This is deliberately hand-rolled
// instead of pulling in the `dotenv` package, since the format needed
// here is trivial (KEY=VALUE lines) and it keeps the scraper dependency-
// free. Import this file FIRST, before anything that reads
// process.env.* at module load time (see scraper/lib/supabaseAdmin.mjs).
//
// Only fills in variables not already set, so real environment
// variables (e.g. set by a CI job or `export`ed in the shell) always
// take priority over the file.
function loadEnvFile(path) {
  let text;
  try {
    text = readFileSync(path, "utf-8");
  } catch {
    return; // fine if the file doesn't exist — e.g. CI sets real env vars instead
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const scraperDir = dirname(fileURLToPath(import.meta.url)); // scraper/lib
const projectRoot = join(scraperDir, "..", "..");
loadEnvFile(join(projectRoot, ".env.local"));
loadEnvFile(join(projectRoot, ".env"));
