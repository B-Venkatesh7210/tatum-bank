type LogMeta = Record<string, unknown> | undefined;

function format(
  level: string,
  message: string,
  meta?: LogMeta
): string {
  const base = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  return JSON.stringify(base);
}

export const logger = {
  info(message: string, meta?: LogMeta): void {
    console.log(format("info", message, meta));
  },
  warn(message: string, meta?: LogMeta): void {
    console.warn(format("warn", message, meta));
  },
  error(message: string, meta?: LogMeta): void {
    console.error(format("error", message, meta));
  },
};
