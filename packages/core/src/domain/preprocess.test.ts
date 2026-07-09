// Validates upload pre-checks. (normalizeForPrint needs a platform image
// binding and is not part of the dependency-free domain layer.)

import { describe, expect, test } from "bun:test";
import { ImageValidationError, MAX_UPLOAD_BYTES, validateUpload } from "./preprocess";

function file(bytes: number, type: string): File {
  return new File([new Uint8Array(bytes)], "x", { type });
}

describe("validateUpload", () => {
  test("accepts a normal png", () => {
    expect(() => validateUpload(file(1024, "image/png"))).not.toThrow();
  });

  test("accepts a file with empty type when non-empty", () => {
    expect(() => validateUpload(file(1024, ""))).not.toThrow();
  });

  test("rejects an empty file with code 'empty'", () => {
    try {
      validateUpload(file(0, "image/png"));
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(ImageValidationError);
      expect((e as ImageValidationError).code).toBe("empty");
    }
  });

  test("rejects an oversized file with code 'too-large'", () => {
    try {
      validateUpload(file(MAX_UPLOAD_BYTES + 1, "image/png"));
      throw new Error("expected throw");
    } catch (e) {
      expect((e as ImageValidationError).code).toBe("too-large");
    }
  });

  test("rejects an unsupported type with code 'unsupported-type'", () => {
    try {
      validateUpload(file(1024, "application/pdf"));
      throw new Error("expected throw");
    } catch (e) {
      expect((e as ImageValidationError).code).toBe("unsupported-type");
    }
  });
});
