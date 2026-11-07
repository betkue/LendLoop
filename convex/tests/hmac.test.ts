import { describe, expect, test } from "vitest";
import { constantTimeEqual, sign, verify } from "../lib/hmac";

const SECRET = "test-secret";
const BODY = JSON.stringify({ eventId: "abc" });

describe("hmac", () => {
  test("accepts a fresh, correctly signed message", async () => {
    const { timestamp, signature } = await sign(SECRET, BODY);
    expect(await verify(SECRET, BODY, timestamp, signature)).toEqual({ ok: true });
  });

  test("rejects a tampered body or a wrong secret", async () => {
    const { timestamp, signature } = await sign(SECRET, BODY);
    expect(await verify(SECRET, BODY + " ", timestamp, signature)).toEqual({ ok: false, reason: "invalid" });
    expect(await verify("other", BODY, timestamp, signature)).toEqual({ ok: false, reason: "invalid" });
  });

  test("rejects replays outside the 5-minute window and missing headers", async () => {
    const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
    const { timestamp, signature } = await sign(SECRET, BODY, sixMinutesAgo);
    expect(await verify(SECRET, BODY, timestamp, signature)).toEqual({ ok: false, reason: "expired" });
    expect(await verify(SECRET, BODY, null, signature)).toEqual({ ok: false, reason: "missing" });
  });

  test("constant-time comparison", () => {
    expect(constantTimeEqual("abcd", "abcd")).toBe(true);
    expect(constantTimeEqual("abcd", "abce")).toBe(false);
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
  });
});
