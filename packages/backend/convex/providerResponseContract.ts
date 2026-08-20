import type { z } from "zod";

export type ProviderRequestResult<Value> =
  | { ok: true; value: Value; attempts: number }
  | { ok: false; error: string; attempts: number };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Brand Agent provider failed";
}

async function withTimeout<Value>(
  request: (attempt: number) => Promise<Value>,
  attempt: number,
  timeoutMs: number,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request(attempt),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(`Brand Agent provider timed out after ${timeoutMs}ms`),
            ),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function runProviderRequest<Schema extends z.ZodType>({
  request,
  schema,
  timeoutMs,
}: {
  request: (attempt: number) => Promise<unknown>;
  schema: Schema;
  timeoutMs: number;
}): Promise<ProviderRequestResult<z.infer<Schema>>> {
  let lastError = "Brand Agent provider failed";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await withTimeout(request, attempt, timeoutMs);
      const parsed = schema.safeParse(response);
      if (!parsed.success) {
        throw new Error(
          "Brand Agent provider returned invalid structured output",
        );
      }
      return { ok: true, value: parsed.data, attempts: attempt };
    } catch (error) {
      lastError = errorMessage(error);
    }
  }

  return { ok: false, error: lastError, attempts: 2 };
}
