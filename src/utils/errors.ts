import type { ErrorModel } from "../types/errors";

export function mapUnknownError(error: unknown): ErrorModel {
  if (error instanceof Error) {
    return {
      code: "unknown",
      message: error.message,
      recoverable: true
    };
  }

  return {
    code: "unknown",
    message: "Unknown error",
    recoverable: true
  };
}
