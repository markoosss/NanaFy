import { isRecord } from "@/lib/http/json";

export async function requestJson(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(input, { ...init, cache: "no-store" });
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error("El servidor devolvió una respuesta no válida.");
  }

  if (!response.ok) {
    throw new Error(
      isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : "No se pudo completar la solicitud.",
    );
  }

  return payload;
}
