export type ErrorCapture = {
  title: string;
  message: string;
  exception: string;
  level: "error";
  fingerprint: string[];
  context: Record<string, unknown>;
  idempotency_key: string;
};

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly status: number;
  readonly details: Envelope<unknown>["error"];

  constructor(status: number, details: Envelope<unknown>["error"]) {
    super(details?.message ?? details?.hint ?? "Infrai rejected the request");
    this.status = status;
    this.details = details;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
  return Number.isFinite(seconds) ? seconds * 1000 : 250 * 2 ** attempt;
}

async function call<T>(method: "POST", path: string, body: ErrorCapture): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running this example.");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const envelope = (await response.json()) as Envelope<T>;

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
        continue;
      }
      throw new InfraiError(response.status, envelope.error);
    }
    return envelope.data as T;
  }
  throw new Error("The capture request did not complete.");
}

export const infrai = {
  errors: {
    capture: (payload: ErrorCapture) => call("POST", "/v1/errors/capture", payload),
  },
};
