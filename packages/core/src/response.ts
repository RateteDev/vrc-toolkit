// Typed error and response parsing shared by every namespace. Ported from the
// Worker's parseVrcResponse: non-200 becomes a typed VrcError carrying the
// envelope's error.message; a 200 with a non-JSON body yields null.

// Wire shape of the VRChat API error envelope. Only the field we surface.
export interface ApiErrorResponse {
  error?: { message?: string };
}

// Max upstream error body kept on a VrcError for diagnostics.
const MAX_ERROR_BODY = 600;

export class VrcError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = "VrcError";
  }
}

// Read a VRChat response body. On non-200, throw VrcError carrying the
// envelope's error.message (or fallback) and a truncated body. On success,
// return the parsed JSON as T (or null if the body was not JSON).
export async function parseVrcResponse<T>(
  res: Response,
  fallbackMessage: string,
): Promise<T | null> {
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  if (res.status !== 200) {
    const message = (json as ApiErrorResponse | null)?.error?.message ?? fallbackMessage;
    throw new VrcError(message, res.status, text.slice(0, MAX_ERROR_BODY));
  }
  return json as T | null;
}
