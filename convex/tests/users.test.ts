import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../_generated/api";
import { setupTest } from "../../test/convex-setup";

const awa = { tokenIdentifier: "clerk|awa", subject: "awa", name: "Awa", email: "awa@example.com" };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("users", () => {
  test("ensureUser creates the user once, as a regular user by default", async () => {
    const t = setupTest();
    const asAwa = t.withIdentity(awa);
    const first = await asAwa.mutation(api.users.ensureUser, { locale: "fr" });
    const second = await asAwa.mutation(api.users.ensureUser, { locale: "en" });
    expect(second).toEqual(first);

    const me = await asAwa.query(api.users.me, {});
    expect(me).toMatchObject({ name: "Awa", role: "user", trustedLender: false, locale: "fr" });
  });

  test("ADMIN_EMAILS grants the admin role", async () => {
    vi.stubEnv("ADMIN_EMAILS", "someone@else.com, AWA@example.com");
    const t = setupTest();
    const asAwa = t.withIdentity(awa);
    await asAwa.mutation(api.users.ensureUser, { locale: "en" });
    expect((await asAwa.query(api.users.me, {}))?.role).toBe("admin");
  });

  test("signed-out callers get null from me and UNAUTHENTICATED from mutations", async () => {
    const t = setupTest();
    expect(await t.query(api.users.me, {})).toBeNull();
    await expect(t.mutation(api.users.setLocale, { locale: "de" })).rejects.toThrow(/UNAUTHENTICATED/);
  });

  test("setLocale updates the notification language", async () => {
    const t = setupTest();
    const asAwa = t.withIdentity(awa);
    await asAwa.mutation(api.users.ensureUser, { locale: "en" });
    await asAwa.mutation(api.users.setLocale, { locale: "zh" });
    expect((await asAwa.query(api.users.me, {}))?.locale).toBe("zh");
  });
});
