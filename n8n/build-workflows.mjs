// Builds the importable n8n workflows (n8n/workflows/*.json) from the Code node
// sources in n8n/code/. Run: node n8n/build-workflows.mjs
// Keeping node code in .js files makes it readable, reviewable and lintable.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const dir = import.meta.dirname;
const code = (name) => readFileSync(join(dir, "code", `${name}.js`), "utf8");
const withMessages = (name) => `${code("messages")}\n${code(name)}`;

const RETRY = { retryOnFail: true, maxTries: 3, waitBetweenTries: 3000 };
const SMTP = { smtp: { id: "lendloopMailpit1", name: "Mailpit (local)" } };
const FROM = "LendLoop <no-reply@lendloop.local>";

let counter = 0;
const node = (name, type, typeVersion, parameters, position, extra = {}) => ({
  id: `lendloop-${++counter}`,
  name,
  type,
  typeVersion,
  position,
  parameters,
  ...extra,
});

const codeNode = (name, source, position) =>
  node(name, "n8n-nodes-base.code", 2, { jsCode: source }, position);

const ifTrue = (name, expression, position) =>
  node(
    name,
    "n8n-nodes-base.if",
    2,
    {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "loose" },
        conditions: [
          {
            id: `${name}-condition`,
            leftValue: `={{ ${expression} }}`,
            rightValue: true,
            operator: { type: "boolean", operation: "true", singleValue: true },
          },
        ],
        combinator: "and",
      },
      options: {},
    },
    position,
  );

const respond = (name, status, body, position) =>
  node(
    name,
    "n8n-nodes-base.respondToWebhook",
    1.1,
    { respondWith: "json", responseBody: body, options: { responseCode: status } },
    position,
  );

const signedPost = (name, path, position) =>
  node(
    name,
    "n8n-nodes-base.httpRequest",
    4.2,
    {
      method: "POST",
      url: `={{ $env.CONVEX_SITE_URL }}${path}`,
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "X-LendLoop-Timestamp", value: "={{ $json.timestamp }}" },
          { name: "X-LendLoop-Signature", value: "={{ $json.signature }}" },
        ],
      },
      sendBody: true,
      contentType: "raw",
      rawContentType: "application/json",
      body: "={{ $json.body }}",
      options: {},
    },
    position,
    RETRY,
  );

const sendEmail = (name, position) =>
  node(
    name,
    "n8n-nodes-base.emailSend",
    2.1,
    {
      fromEmail: FROM,
      toEmail: "={{ $json.to }}",
      subject: "={{ $json.subject }}",
      emailFormat: "both",
      text: "={{ $json.text }}",
      html: "={{ $json.html }}",
      options: { appendAttribution: false },
    },
    position,
    { ...RETRY, credentials: SMTP },
  );

const link = (...names) => {
  const connections = {};
  for (let i = 0; i < names.length - 1; i++) {
    connections[names[i]] = { main: [[{ node: names[i + 1], type: "main", index: 0 }]] };
  }
  return connections;
};

const settings = { executionOrder: "v1", errorWorkflow: "LendLoopErrors01", saveManualExecutions: true };

// Workflow 1: Convex → signed webhook → email to the person concerned → signed write-back.
const notification = {
  id: "LendLoopNotify01",
  name: "LendLoop · Loan notifications",
  active: false,
  settings,
  nodes: [
    node(
      "Webhook",
      "n8n-nodes-base.webhook",
      2,
      { httpMethod: "POST", path: "lendloop-events", responseMode: "responseNode", options: { rawBody: true } },
      [0, 300],
      { webhookId: "4f1d2c3b-lendloop-events" },
    ),
    codeNode("Verify signature", code("verify-webhook"), [220, 300]),
    ifTrue("Signature valid?", "$json.valid", [440, 300]),
    respond("Reject (401)", 401, "={{ JSON.stringify({ error: 'unauthorized', reason: $json.reason }) }}", [660, 480]),
    ifTrue("Already handled?", "$json.duplicate", [660, 200]),
    respond("Ignore duplicate", 200, '{ "status": "duplicate" }', [880, 80]),
    codeNode("Compose email", withMessages("compose-notification"), [880, 300]),
    sendEmail("Send email", [1100, 300]),
    codeNode("Remember and sign result", code("sign-notification-result"), [1320, 300]),
    signedPost("Report to Convex", "/n8n/notification-result", [1540, 300]),
    respond("Respond sent", 200, '{ "status": "sent" }', [1760, 300]),
  ],
  connections: {
    ...link("Webhook", "Verify signature", "Signature valid?"),
    "Signature valid?": {
      main: [
        [{ node: "Already handled?", type: "main", index: 0 }],
        [{ node: "Reject (401)", type: "main", index: 0 }],
      ],
    },
    "Already handled?": {
      main: [
        [{ node: "Ignore duplicate", type: "main", index: 0 }],
        [{ node: "Compose email", type: "main", index: 0 }],
      ],
    },
    ...link("Compose email", "Send email", "Remember and sign result", "Report to Convex", "Respond sent"),
  },
};

// Workflow 2: every morning, overdue and due-tomorrow reminders, recorded back in Convex.
const reminders = {
  id: "LendLoopRemind01",
  name: "LendLoop · Daily reminders",
  active: false,
  settings,
  nodes: [
    node(
      "Every day at 8:00",
      "n8n-nodes-base.scheduleTrigger",
      1.2,
      { rule: { interval: [{ field: "cronExpression", expression: "0 8 * * *" }] } },
      [0, 300],
    ),
    codeNode("Sign request", code("sign-due-request"), [220, 300]),
    node(
      "Fetch due reminders",
      "n8n-nodes-base.httpRequest",
      4.2,
      {
        method: "GET",
        url: "={{ $env.CONVEX_SITE_URL }}/n8n/due-reminders",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "X-LendLoop-Timestamp", value: "={{ $json.timestamp }}" },
            { name: "X-LendLoop-Signature", value: "={{ $json.signature }}" },
          ],
        },
        options: {},
      },
      [440, 300],
      RETRY,
    ),
    codeNode("Compose reminders", withMessages("compose-reminders"), [660, 300]),
    sendEmail("Send reminder", [880, 300]),
    codeNode("Sign results", code("sign-reminder-results"), [1100, 300]),
    signedPost("Record in Convex", "/n8n/reminder-result", [1320, 300]),
  ],
  connections: link(
    "Every day at 8:00",
    "Sign request",
    "Fetch due reminders",
    "Compose reminders",
    "Send reminder",
    "Sign results",
    "Record in Convex",
  ),
};

// Error workflow: any failure after retries is logged and reported to Convex.
const errors = {
  id: "LendLoopErrors01",
  name: "LendLoop · Error handler",
  active: false,
  settings: { executionOrder: "v1" },
  nodes: [
    node("Error Trigger", "n8n-nodes-base.errorTrigger", 1, {}, [0, 300]),
    codeNode("Build report", code("build-error-report"), [220, 300]),
    signedPost("Report to Convex", "/n8n/automation-error", [440, 300]),
  ],
  connections: link("Error Trigger", "Build report", "Report to Convex"),
};

mkdirSync(join(dir, "workflows"), { recursive: true });
for (const [file, workflow] of [
  ["notification.json", notification],
  ["due-reminders.json", reminders],
  ["error-handler.json", errors],
]) {
  writeFileSync(join(dir, "workflows", file), `${JSON.stringify(workflow, null, 2)}\n`);
  console.log(`wrote n8n/workflows/${file}`);
}
