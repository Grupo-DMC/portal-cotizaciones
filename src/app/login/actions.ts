"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { crearCookieSesion, borrarCookieSesion } from "@/server/auth/session";
import { hashSenuelo, verifyPassword } from "@/server/auth/password";
import { limpiar, minutosBloqueado, registrarFallo } from "@/server/auth/rate-limit";
import { rutaSegura } from "@/server/auth/dal";
import { usuarioPorCorreo } from "@/server/data/queries";
import type { ActionState } from "@/server/actions/helpers";

const esquema = z.object({
  correo: z.string().trim().toLowerCase().min(1, "Ingrese su correo").max(120),
  clave: z.string().min(1, "Ingrese su contraseña").max(200),
  next: z.string().max(300).optional(),
});

const MENSAJE_GENERICO = "Correo o contraseña incorrectos.";

export async function iniciarSesion(_prev: ActionState | undefined, fd: FormData): Promise<ActionState | undefined> {
  const r = esquema.safeParse(Object.fromEntries(fd));
  if (!r.success) return { error: "Ingrese su correo y su contraseña." };
  const { correo, clave, next } = r.data;

  const h = await headers();
  // Detrás de un proxy de confianza, x-forwarded-for trae la IP real del cliente.
  const ip = (h.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const claveCuenta = `cuenta:${correo}`;
  const claveIp = `ip:${ip}`;

  const bloqueo = Math.max(minutosBloqueado(claveCuenta), minutosBloqueado(claveIp));
  if (bloqueo > 0) return { error: `Demasiados intentos fallidos. Intente de nuevo en ${bloqueo} min.` };

  const usuario = await usuarioPorCorreo(correo);
  // Se verifica siempre un hash (real o señuelo) para no revelar por tiempo si el usuario existe.
  const claveOk = verifyPassword(clave, usuario?.claveHash ?? hashSenuelo());
  if (!usuario || !claveOk || !usuario.activo) {
    registrarFallo(claveCuenta, 5);
    registrarFallo(claveIp, 30);
    return { error: MENSAJE_GENERICO };
  }

  limpiar(claveCuenta);
  await crearCookieSesion(usuario.id, usuario.claveHash);
  redirect(rutaSegura(next) ?? "/inicio");
}

export async function cerrarSesion() {
  await borrarCookieSesion();
  redirect("/login");
}
