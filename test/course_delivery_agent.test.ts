import assert from "node:assert/strict";
import test from "node:test";
import { courseDeliveryRequest, decideCourseDelivery } from "../src/course_delivery_agent";

test("a missed learner deadline queues an educator report", () => {
  const input = courseDeliveryRequest.parse({
    runId: "course-run-test",
    courseId: "biology-101",
    learnerId: "learner-77",
    educatorId: "educator-8",
    lessonTitle: "Cell division review",
    deadlineAt: "2026-09-14T09:00:00.000Z",
    now: "2026-09-14T09:15:00.000Z",
  });

  assert.deepEqual(decideCourseDelivery(input), {
    state: "educator_report_queued",
    educatorReport: "deadline_missed",
  });
});
