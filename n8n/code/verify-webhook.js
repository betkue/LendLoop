// Workflow 1 · Verify signature
// Checks the HMAC signature Convex put on the request (lib/hmac.ts):
// hex(HMAC_SHA256(HMAC_SECRET_CONVEX_TO_N8N, `${timestamp}.${rawBody}`)), with
// the timestamp inside a 5-minute window so captured requests cannot be replayed.
// Also flags events already handled (Convex retries, replays inside the window).
const crypto = require('crypto');

const MAX_SKEW_MS = 5 * 60 * 1000;
const item = $input.first();
const headers = item.json.headers || {};
const timestamp = headers['x-lendloop-timestamp'];
const signature = String(headers['x-lendloop-signature'] || '').toLowerCase();
const secret = $env.HMAC_SECRET_CONVEX_TO_N8N;

// The webhook keeps the raw body (Raw Body option) so the signature is checked
// on the exact bytes Convex signed.
let raw;
if (item.binary && item.binary.data) {
  raw = (await this.helpers.getBinaryDataBuffer(0, 'data')).toString('utf8');
} else {
  raw = JSON.stringify(item.json.body);
}

const reject = (reason) => [{ json: { valid: false, reason } }];
if (!secret || !timestamp || !signature) return reject('missing');
if (!Number.isFinite(Number(timestamp)) || Math.abs(Date.now() - Number(timestamp)) > MAX_SKEW_MS) {
  return reject('expired');
}

const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
const a = Buffer.from(expected);
const b = Buffer.from(signature);
if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return reject('invalid');

const event = JSON.parse(raw);
const handled = $getWorkflowStaticData('global').handledEventIds || [];
return [{ json: { valid: true, duplicate: handled.includes(event.eventId), event } }];
