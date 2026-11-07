// Workflow 2 · Compose reminders (MESSAGES and composeEmail are inlined above by the build script)
// One item per reminder returned by Convex (overdue, or due tomorrow).
const reminders = $input.first().json.reminders || [];
return reminders.map((reminder) => ({
  json: {
    ...composeEmail(reminder.type, reminder.recipient, {
      other: reminder.ownerFirstName,
      tool: reminder.loan.toolName,
      start: reminder.loan.startDate,
      end: reminder.loan.endDate,
    }),
    eventId: reminder.eventId,
    loanId: reminder.loan.id,
    type: reminder.type,
  },
}));
