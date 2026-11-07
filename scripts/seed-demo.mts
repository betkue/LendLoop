/**
 * Loads the demo with real, sign-in-able accounts.
 *
 *   node scripts/seed-demo.mts                       # demo neighbors only
 *   node scripts/seed-demo.mts --me you@example.com  # also give your own account listings and history
 *   node scripts/seed-demo.mts --prod                # seed the project's production deployment instead
 *
 * 1. Creates (or reuses) the demo neighbors in your Clerk DEVELOPMENT instance,
 *    using CLERK_SECRET_KEY from .env.local. Test accounts only: the emails use
 *    the "+clerk_test" suffix and all share DEMO_PASSWORD below.
 * 2. Resets the demo data in Convex and runs seed:run with those identities, so
 *    each neighbor signs in to a populated account with a loan history.
 *
 * Refuses to run with a production key (sk_live_…).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Shared password of the demo test accounts (development instance only). */
export const DEMO_PASSWORD = "LendLoop-Demo-2026";

const PEOPLE = [
  { key: "awa", first: "Awa", last: "Diallo", email: "awa+clerk_test@lendloop.dev" },
  { key: "marc", first: "Marc", last: "Lefèvre", email: "marc+clerk_test@lendloop.dev" },
  { key: "lea", first: "Léa", last: "Martin", email: "lea+clerk_test@lendloop.dev" },
  { key: "sophie", first: "Sophie", last: "Wagner", email: "sophie+clerk_test@lendloop.dev" },
  { key: "admin", first: "LendLoop", last: "Admin", email: "admin+clerk_test@lendloop.dev" },
];

const root = join(import.meta.dirname, "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).split(" #")[0].trim()]),
);

const secret = env.CLERK_SECRET_KEY;
const publishable = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!secret?.startsWith("sk_test_") || !publishable?.startsWith("pk_test_")) {
  console.error("Needs development Clerk keys (sk_test_/pk_test_) in .env.local. Aborting.");
  process.exit(1);
}

// The publishable key encodes the Frontend API host, which is the JWT issuer:
// Convex identifies users as `${issuer}|${clerkUserId}`.
const frontendApi = Buffer.from(publishable.slice("pk_test_".length), "base64").toString("utf8").replace(/\$$/, "");
const issuer = `https://${frontendApi}`;

async function clerk<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) throw new Error(`Clerk ${init.method ?? "GET"} ${path}: ${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}

type ClerkUser = { id: string; first_name: string | null; last_name: string | null };

async function findUser(email: string) {
  const users = await clerk<ClerkUser[]>(`/users?email_address=${encodeURIComponent(email)}`);
  return users[0] ?? null;
}

const accounts: { key: string; tokenIdentifier: string; email: string; name: string }[] = [];
for (const person of PEOPLE) {
  const user =
    (await findUser(person.email)) ??
    (await clerk<ClerkUser>("/users", {
      method: "POST",
      body: JSON.stringify({
        email_address: [person.email],
        password: DEMO_PASSWORD,
        first_name: person.first,
        last_name: person.last,
        skip_password_checks: true,
      }),
    }));
  accounts.push({
    key: person.key,
    tokenIdentifier: `${issuer}|${user.id}`,
    email: person.email,
    name: `${person.first} ${person.last}`,
  });
  console.log(`account ready: ${person.email}`);
}

const meIndex = process.argv.indexOf("--me");
const meEmail = meIndex > 0 ? process.argv[meIndex + 1] : undefined;
if (meEmail) {
  const me = await findUser(meEmail);
  if (me) {
    accounts.push({
      key: "me",
      tokenIdentifier: `${issuer}|${me.id}`,
      email: meEmail,
      name: [me.first_name, me.last_name].filter(Boolean).join(" ") || meEmail.split("@")[0],
    });
    console.log(`your account will get listings and history: ${meEmail}`);
  } else {
    console.log(`no Clerk account for ${meEmail} yet: sign up once, then rerun with --me`);
  }
}

// Runs the Convex CLI through node, without a shell: a Windows shell would mangle the JSON argument.
const convexCli = join(root, "node_modules", "convex", "bin", "main.js");
const run = (args: string[]) =>
  execFileSync(process.execPath, [convexCli, ...args], { cwd: root, encoding: "utf8" }).trim();
// --prod targets the project's production deployment (same Clerk development instance).
const target = process.argv.includes("--prod") ? ["--prod"] : [];
console.log(run(["run", ...target, "seed:reset"]));
console.log(run(["run", ...target, "seed:run", JSON.stringify({ accounts })]));
console.log(`\nSign in with any demo email above and the password: ${DEMO_PASSWORD}`);
