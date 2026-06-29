const LOG_PREFIX = "[WardBalance]";

export function logError(context: string, error: unknown, meta?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : "Unknown error";
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`${LOG_PREFIX} [${context}] ${message}`, stack ?? "", meta ?? {});
}

export function logInfo(context: string, message: string, meta?: Record<string, unknown>): void {
  console.log(`${LOG_PREFIX} [${context}] ${message}`, meta ?? {});
}

export function logWarn(context: string, message: string, meta?: Record<string, unknown>): void {
  console.warn(`${LOG_PREFIX} [${context}] ${message}`, meta ?? {});
}
