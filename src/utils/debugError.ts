export const formatDebugError = (label: string, error: unknown): string => {
  const lines = [`[${label}]`];

  if (error instanceof Error) {
    lines.push(`name: ${error.name}`);
    lines.push(`message: ${error.message}`);
    if (error.stack) {
      lines.push(`stack: ${error.stack}`);
    }
    return lines.join("\n");
  }

  lines.push(`type: ${typeof error}`);
  lines.push(`value: ${stringifyUnknown(error)}`);
  return lines.join("\n");
};

export const stringifyUnknown = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, createCircularReplacer(), 2);
  } catch {
    return String(value);
  }
};

const createCircularReplacer = (): ((key: string, value: unknown) => unknown) => {
  const seen = new WeakSet<object>();

  return (_key: string, value: unknown): unknown => {
    if (typeof value !== "object" || value === null) {
      return value;
    }
    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);
    return value;
  };
};
