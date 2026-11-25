import { createHash, randomBytes } from "node:crypto";

const ACTIVATION_CODE_BYTES = 24;
const SESSION_TOKEN_BYTES = 32;

export function createActivationCode(): string {
  return randomBytes(ACTIVATION_CODE_BYTES).toString("base64url");
}

export function isActivationCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32}$/.test(value);
}

export function hashActivationCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function isSessionToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
