import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// scrypt con parámetros OWASP (N=2^15, r=8, p=1) y sal aleatoria por clave.
const N = 32768;
const R = 8;
const P = 1;
const KEYLEN = 32;
const MAXMEM = 128 * N * R * 2;

export function hashPassword(clave: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(clave, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

export function verifyPassword(clave: string, almacenado: string): boolean {
  const partes = almacenado.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;
  const [, n, r, p, salt, hash] = partes;
  const esperado = Buffer.from(hash, "base64");
  const obtenido = scryptSync(clave, Buffer.from(salt, "base64"), esperado.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: MAXMEM,
  });
  return esperado.length === obtenido.length && timingSafeEqual(esperado, obtenido);
}

/** Hash ficticio para igualar el tiempo de respuesta cuando el usuario no existe. */
let senuelo: string | null = null;
export function hashSenuelo(): string {
  senuelo ??= hashPassword(randomBytes(12).toString("hex"));
  return senuelo;
}
