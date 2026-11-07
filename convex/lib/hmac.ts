/**
 * HMAC-SHA256 signatures for every message exchanged with n8n.
 *
 * signature = hex(HMAC(secret, `${timestamp}.${body}`)), sent with the
 * X-LendLoop-Timestamp (milliseconds) and X-LendLoop-Signature headers.
 * Signing the timestamp with the body means an intercepted message cannot be
 * replayed later: receivers reject timestamps outside a 5-minute window.
 */

export const SIGNATURE_HEADER = "X-LendLoop-Signature";
export const TIMESTAMP_HEADER = "X-LendLoop-Timestamp";
export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Compares two strings in time independent of where they differ. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sign(secret: string, body: string, timestamp: number = Date.now()) {
  return { timestamp: String(timestamp), signature: await hmacHex(secret, `${timestamp}.${body}`) };
}

export type VerifyResult = { ok: true } | { ok: false; reason: "missing" | "expired" | "invalid" };

/** Checks the timestamp window first, then the signature in constant time. */
export async function verify(
  secret: string,
  body: string,
  timestamp: string | null,
  signature: string | null,
  now: number = Date.now(),
): Promise<VerifyResult> {
  if (!secret || !timestamp || !signature) return { ok: false, reason: "missing" };
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(now - sentAt) > MAX_CLOCK_SKEW_MS) {
    return { ok: false, reason: "expired" };
  }
  const expected = await hmacHex(secret, `${timestamp}.${body}`);
  return constantTimeEqual(expected, signature.toLowerCase()) ? { ok: true } : { ok: false, reason: "invalid" };
}
