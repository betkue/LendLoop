// Workflow 2 · Sign results
// One signed write-back per reminder sent. Convex records each eventId once,
// so a rerun of this workflow on the same day is harmless.
const crypto = require('crypto');

const composed = $('Compose reminders').all();
return composed.map(({ json }) => {
  const body = JSON.stringify({ eventId: json.eventId, loanId: json.loanId, type: json.type, channel: 'email' });
  const timestamp = String(Date.now());
  const signature = crypto
    .createHmac('sha256', $env.HMAC_SECRET_N8N_TO_CONVEX)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return { json: { body, timestamp, signature } };
});
