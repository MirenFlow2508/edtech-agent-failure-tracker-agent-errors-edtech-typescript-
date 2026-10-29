import { z } from "zod";
import { infrai, InfraiError } from "./edtech_error_reporter";

export const courseDeliveryRequest = z.object({
  runId: z.string().min(1),
  courseId: z.string().min(1),
  learnerId: z.string().min(1),
  educatorId: z.string().min(1),
  lessonTitle: z.string().min(1),
  deadlineAt: z.coerce.date(),
  now: z.coerce.date(),
});

export type CourseDeliveryRequest = z.infer<typeof courseDeliveryRequest>;

export type DeliveryDecision =
  | { state: "lesson_delivered"; educatorReport: "not_needed" }
  | { state: "educator_report_queued"; educatorReport: "deadline_missed" };

export function decideCourseDelivery(input: CourseDeliveryRequest): DeliveryDecision {
  return input.now > input.deadlineAt
    ? { state: "educator_report_queued", educatorReport: "deadline_missed" }
    : { state: "lesson_delivered", educatorReport: "not_needed" };
}

export async function runCourseDelivery(input: CourseDeliveryRequest): Promise<DeliveryDecision> {
  const decision = decideCourseDelivery(input);
  if (decision.state === "lesson_delivered") return decision;

  try {
    throw new Error("lesson generation missed the learner deadline");
  } catch (cause) {
    const error = cause instanceof Error ? cause : new Error("course delivery stopped");
    try {
      await infrai.errors.capture({
        title: "course delivery deadline missed",
        message: error.message,
        exception: error.stack ?? error.message,
        level: "error",
        fingerprint: ["course-delivery-agent", "deadline-check"],
        context: {
          courseId: input.courseId,
          learnerId: input.learnerId,
          educatorId: input.educatorId,
          lessonTitle: input.lessonTitle,
          deadlineAt: input.deadlineAt.toISOString(),
        },
        idempotency_key: input.runId,
      });
    } catch (captureError) {
      if (captureError instanceof InfraiError && captureError.status >= 400 && captureError.status < 500) {
        return decision;
      }
      throw captureError;
    }
    return decision;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = courseDeliveryRequest.parse({
    runId: "course-run-1042",
    courseId: "biology-101",
    learnerId: "learner-77",
    educatorId: "educator-8",
    lessonTitle: "Cell division review",
    deadlineAt: "2026-09-14T09:00:00.000Z",
    now: "2026-09-14T09:15:00.000Z",
  });
  runCourseDelivery(input).then((result) => console.log(JSON.stringify(result)));
}
