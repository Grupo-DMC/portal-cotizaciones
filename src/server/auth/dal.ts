import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESION, huellaClave, leerSesion } from "./session";
import { rolPorId, usuarioPorId } from "@/server/data/queries";
import { nombreCompleto } from "@/server/data/store";
import type { Rol } from "@/server/data/types";

/**
 * Capa de acceso a datos (DAL) de autenticación y autorización.
 *
 * Aquí se verifica de verdad (firma, expiración, usuario activo, rol activo,
 * permiso de página). Antes cada página del sistema original confiaba en
 * ocultar <li> del menú; ahora TODA página, acción y ruta API llama a
 * requirePermission() / getSessionUser() en el servidor.
 */
export interface SesionUsuario {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  paginas: number[];
}

export const getSessionUser = cache(async (): Promise<SesionUsuario | null> => {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  const carga = leerSesion(token);
  if (!carga) return null;
  const u = await usuarioPorId(carga.uid);
  if (!u || !u.activo || huellaClave(u.claveHash) !== carga.h) return null;
  const rol = await rolPorId(u.rolId);
  if (!rol || !rol.activo) return null;
  return { id: u.id, nombre: nombreCompleto(u), correo: u.correo, rol, paginas: rol.paginas };
});

export async function requireUser(): Promise<SesionUsuario> {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  return u;
}

export function puede(u: SesionUsuario, codigo: number) {
  return u.paginas.includes(codigo);
}

/** Exige sesión y que el rol tenga al menos uno de los códigos de página. */
export async function requirePermission(...codigos: number[]): Promise<SesionUsuario> {
  const u = await requireUser();
  if (!codigos.some((c) => puede(u, c))) redirect("/inicio?denegado=1");
  return u;
}

/** Acepta solo rutas internas relativas (evita redirecciones abiertas). */
export function rutaSegura(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || next.includes("://")) return null;
  if (next.startsWith("/login")) return null;
  return next;
}
