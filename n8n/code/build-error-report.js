// Error workflow · Build report
// Runs when workflow 1 or 2 fails after its retries. Logs the failure and
// prepares a signed report for Convex; when the failing item carried a loan id,
// Convex shows "An automation failed" in that loan's history.
const crypto = require('crypto');

const { execution = {}, workflow = {} } = $input.first().json;
const error = execution.error || {};
const loanId = (() => {
  try {
    const lastNode = execution.lastNodeExecuted;
    const data = lastNode ? $(lastNode).first().json : {};
    return data.loanId || (data.event && data.event.loan && data.event.loan.id) || undefined;
  } catch {
    return undefined;
  }
})();

const report = {
  eventId: `error:${execution.id || Date.now()}`,
  workflow: workflow.name || 'unknown',
  node: execution.lastNodeExecuted || 'unknown',
  message: String(error.message || 'Unknown error').slice(0, 300),
  ...(loanId ? { loanId } : {}),
};
console.log('LendLoop automation failure', JSON.stringify(report));

const body = JSON.stringify(report);
const timestamp = String(Date.now());
const signature = crypto
  .createHmac('sha256', $env.HMAC_SECRET_N8N_TO_CONVEX)
  .update(`${timestamp}.${body}`)
  .digest('hex');
return [{ json: { body, timestamp, signature } }];
