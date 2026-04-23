export function parseJsonValue<T>(
  raw: null | string | undefined,
  fallback: T
): T {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function stringifyJsonValue(value: unknown) {
  return JSON.stringify(value);
}
