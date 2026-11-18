import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE_SESION = "dmc_session";
const DURACION_SEG = 8 * 60 * 60; // 8 horas

function secreto(): string {
  const v = process.env.SESSION_SECRET;
  if (v && v.length >= 32) return v;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET debe definirse (mínimo 32 caracteres) en producción.");
  }
  return "dmc-clave-solo-para-desarrollo-local-no-usar-en-produccion";
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const firma = (datos: string) => createHmac("sha256", secreto()).update(datos).digest();

/** Huella corta de la clave: cambiar la contraseña invalida las sesiones abiertas. */
export const huellaClave = (claveHash: string) => createHash("sha256").update(claveHash).digest("base64url").slice(0, 10);

interface Carga { uid: number; exp: number; h: string }

export function firmarSesion(uid: number, claveHash: string): string {
  const carga: Carga = { uid, exp: Math.floor(Date.now() / 1000) + DURACION_SEG, h: huellaClave(claveHash) };
  const cuerpo = b64(JSON.stringify(carga));
  return `${cuerpo}.${b64(firma(cuerpo))}`;
}

export function leerSesion(token: string | undefined): Carga | null {
  if (!token) return null;
  const [cuerpo, sig, ...resto] = token.split(".");
  if (!cuerpo || !sig || resto.length) return null;
  const esperada = firma(cuerpo);
  let recibida: Buffer;
  try { recibida = Buffer.from(sig, "base64url"); } catch { return null; }
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;
  try {
    const c = JSON.parse(Buffer.from(cuerpo, "base64url").toString()) as Carga;
    if (typeof c.uid !== "number" || typeof c.exp !== "number" || c.exp < Date.now() / 1000) return null;
    return c;
  } catch { return null; }
}

export async function crearCookieSesion(uid: number, claveHash: string) {
  (await cookies()).set(COOKIE_SESION, firmarSesion(uid, claveHash), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: DURACION_SEG,
  });
}

export async function borrarCookieSesion() {
  (await cookies()).delete(COOKIE_SESION);
}
