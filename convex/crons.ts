import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Retries outbox events that could not be delivered (n8n down, timeout, 5xx).
crons.interval("deliver queued notifications", { minutes: 1 }, internal.outbox.dispatch, {});

export default crons;
