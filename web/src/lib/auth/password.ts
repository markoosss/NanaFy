import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SCRYPT_OPTIONS = {
  N: 32_768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(Buffer.from(key));
    });
  });
}

export function isValidPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    Array.from(value).length >= 10 &&
    Buffer.byteLength(value, "utf8") <= 1024
  );
}

export async function hashPassword(password: string): Promise<string> {
  if (!isValidPassword(password)) {
    throw new Error("Password must contain at least 10 characters.");
  }

  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(password, salt);

  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (!isValidPassword(password)) {
    return false;
  }

  const [algorithm, encodedSalt, encodedKey, ...extraParts] =
    storedHash.split("$");

  if (
    algorithm !== "scrypt" ||
    !encodedSalt ||
    !encodedKey ||
    extraParts.length > 0
  ) {
    return false;
  }

  const salt = Buffer.from(encodedSalt, "base64url");
  const expectedKey = Buffer.from(encodedKey, "base64url");

  if (salt.length !== SALT_LENGTH || expectedKey.length !== KEY_LENGTH) {
    return false;
  }

  const actualKey = await deriveKey(password, salt);
  return timingSafeEqual(actualKey, expectedKey);
}
