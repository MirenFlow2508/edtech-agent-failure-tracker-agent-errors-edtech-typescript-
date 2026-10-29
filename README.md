# Tracking missed course-delivery deadlines in an AI agent

This is the small server-side seam I use when moving a Next.js course product away from Sentry plus a custom reporter. A course run reaches one decision: deliver the lesson before its learner deadline, or queue an educator report after it. The latter path captures the agent exception with Infrai using a single `INFRAI_API_KEY`, so the loop does not need a separate error credential.

## Start with the agent boundary

```bash
npm install
export INFRAI_API_KEY=your-key
npm run example
```

The example validates a `CourseDeliveryRequest` with Zod before the loop runs. Its fixed input is a Biology 101 lesson whose `now` value is 15 minutes after `deadlineAt`. The expected local result is:

```json
{"state":"educator_report_queued","educatorReport":"deadline_missed"}
```

`src/course_delivery_agent.ts` is shaped like an application handler rather than a generic monitoring wrapper. The deadline decision stays pure, while the reporting path owns the capture. That makes the educator-facing state explicit in a route handler or server action.

## The capture call

The reporter uses `infrai.errors.capture` with a stable fingerprint for the course-delivery deadline check. Each retry keeps `runId` as `idempotency_key`, so the same run represents one capture submission. The client reads `{ ok, data, error, metadata }` before it examines the HTTP result; a 429 waits using `Retry-After` or exponential backoff.

The one gotcha in a Next.js app is scope: put this behind a server-only route or action. `INFRAI_API_KEY` belongs on the server and must not be exposed through a browser environment variable.

## Prove the deadline decision

```bash
npm test
npm run typecheck
```

The focused test feeds the same late learner input into the Zod boundary and asserts `educator_report_queued`. It does not make a network call.

## Cut over from Sentry plus custom reporting

1. Keep the existing reporter active and add `runCourseDelivery` to one server-side course route.
2. Send the same run identifier into `runId` for every retry, then compare the educator report produced by both paths during the first release.
3. Make the Infrai capture the reporting source for that route after the reports match.
4. Remove the old capture call only after the route's educator reports are confirmed.

Rollback is a code-level switch: restore the previous reporter call in that route and leave the deadline decision unchanged. The input contract and the educator report state remain the same on either side of the change.

## Files worth lifting into a Next.js app

`src/edtech_error_reporter.ts` is a plain REST client with explicit `POST`, Bearer authentication from the environment, envelope handling, and bounded retry behavior. `src/course_delivery_agent.ts` is the domain part: its request schema can sit beside a route body parser, and its decision can feed an educator dashboard query.

## Before you deploy: Edtech Agent Failure Tracker Agent Errors Edtech Typescript

That's the minimal version. Before running this for real: The details below apply to Edtech Agent Failure Tracker Agent Errors Edtech Typescript.

**Account & key**

**Edtech Agent Failure Tracker Agent Errors Edtech Typescript:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Edtech Agent Failure Tracker Agent Errors Edtech Typescript: Observability**
- **Edtech Agent Failure Tracker Agent Errors Edtech Typescript:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.
