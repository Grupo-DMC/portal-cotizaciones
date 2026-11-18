import "server-only";
import { crearSeed } from "./seed";
import type { Store } from "./types";

/**
 * Almacén en memoria con datos ficticios.
 *
 * Sobrevive a las recargas en caliente de Next (globalThis) y se reinicia al
 * reiniciar el servidor. Para pasar a SQL Server, reemplaza las funciones de
 * `queries.ts` y `commands.ts` por consultas a `src/server/db/mssql.ts`
 * (ver docs/MIGRACION_MSSQL.md con el mapa de procedimientos almacenados).
 */
const g = globalThis as unknown as { __dmcStore?: Store };

export function getStore(): Store {
  g.__dmcStore ??= crearSeed();
  return g.__dmcStore;
}

export function nextId(clave: string): number {
  const s = getStore();
  s.seq[clave] = (s.seq[clave] ?? 0) + 1;
  return s.seq[clave];
}

export class ErrorNegocio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorNegocio";
  }
}

export const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function coincide(q: string | undefined, ...campos: (string | number | null | undefined)[]) {
  if (!q) return true;
  const n = norm(q.trim());
  if (!n) return true;
  return campos.some((c) => c != null && norm(String(c)).includes(n));
}

export function nombreCompleto(u: { nombre: string; apPaterno: string; apMaterno?: string }) {
  return `${u.nombre} ${u.apPaterno}`.trim();
}
