// Workflow 1 · Compose email (MESSAGES and composeEmail are inlined above by the build script)
const { event } = $input.first().json;
const email = composeEmail(event.type, event.recipient, {
  other: event.otherPartyFirstName,
  tool: event.loan.toolName,
  start: event.loan.startDate,
  end: event.loan.endDate,
});
return [{ json: { ...email, eventId: event.eventId, loanId: event.loan.id } }];
