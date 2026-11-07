// Workflow 2 · Sign request
// GET requests have an empty body: the signature covers `${timestamp}.`.
const crypto = require('crypto');

const timestamp = String(Date.now());
const signature = crypto
  .createHmac('sha256', $env.HMAC_SECRET_N8N_TO_CONVEX)
  .update(`${timestamp}.`)
  .digest('hex');
return [{ json: { timestamp, signature } }];
