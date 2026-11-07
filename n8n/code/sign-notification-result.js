// Workflow 1 · Remember and sign result
// The email went out: remember the eventId (so a retry from Convex is not sent
// twice) and sign the write-back with HMAC_SECRET_N8N_TO_CONVEX.
const crypto = require('crypto');

const { eventId, loanId } = $('Compose email').first().json;
const staticData = $getWorkflowStaticData('global');
const handled = staticData.handledEventIds || [];
if (!handled.includes(eventId)) handled.push(eventId);
staticData.handledEventIds = handled.slice(-1000);

const body = JSON.stringify({ eventId, loanId, channel: 'email' });
const timestamp = String(Date.now());
const signature = crypto
  .createHmac('sha256', $env.HMAC_SECRET_N8N_TO_CONVEX)
  .update(`${timestamp}.${body}`)
  .digest('hex');
return [{ json: { body, timestamp, signature } }];
