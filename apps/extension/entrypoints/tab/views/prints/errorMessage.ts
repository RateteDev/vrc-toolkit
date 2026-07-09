import { VrcError } from "@vrc-toolkit/core";

// Normalize a caught error into display text. VrcError already carries the
// VRChat API's own error message; anything else falls back to its own message
// or a String() coercion.
export function errorMessage(err: unknown): string {
  if (err instanceof VrcError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
