export async function readJsonBody(
  request: Request,
): Promise<unknown | undefined> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined;
    }

    throw error;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
