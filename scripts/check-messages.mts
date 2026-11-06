/**
 * Compares every messages/<locale>.json with messages/en.json (the source of truth).
 *
 *   npm run i18n:check              report missing keys, fail on unknown keys
 *   npm run i18n:check -- --strict  also fail on missing keys (once all languages are translated)
 *
 * Runs with Node's built-in TypeScript support (Node 22.18+); .mts marks it as an ES module.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Messages = { [key: string]: string | Messages };

const MESSAGES_DIR = join(import.meta.dirname, "..", "messages");
const SOURCE_LOCALE = "en";
const strict = process.argv.includes("--strict");

function load(locale: string): Messages {
  return JSON.parse(readFileSync(join(MESSAGES_DIR, `${locale}.json`), "utf8")) as Messages;
}

/** Flattens nested messages into dotted keys: { a: { b: "x" } } -> ["a.b"]. */
function flatten(messages: Messages, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : flatten(value, path);
  });
}

const sourceKeys = new Set(flatten(load(SOURCE_LOCALE)));
const locales = readdirSync(MESSAGES_DIR)
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.replace(/\.json$/, ""))
  .filter((locale) => locale !== SOURCE_LOCALE);

let failed = false;

for (const locale of locales) {
  const keys = new Set(flatten(load(locale)));
  const missing = [...sourceKeys].filter((key) => !keys.has(key));
  const unknown = [...keys].filter((key) => !sourceKeys.has(key));

  const status = missing.length === 0 && unknown.length === 0 ? "ok" : "issues";
  console.log(`${locale}: ${keys.size}/${sourceKeys.size} keys (${status})`);
  for (const key of missing) console.log(`  missing  ${key}`);
  for (const key of unknown) console.log(`  unknown  ${key}`);

  // Unknown keys are always a bug (typo or key removed from en.json).
  if (unknown.length > 0 || (strict && missing.length > 0)) failed = true;
}

process.exit(failed ? 1 : 0);
