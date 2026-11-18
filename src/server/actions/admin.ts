"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/server/auth/dal";
import * as cmd from "@/server/data/commands";
import { activoSN, conNegocio, correo, idNum, parseForm, texto, type ActionState } from "./helpers";
import { href } from "@/lib/urls";
import { PAGINAS } from "@/lib/permisos";
import { ESTADOS, type EstadoCodigo } from "@/server/data/types";

type Estado = Promise<ActionState | undefined>;

/** Política de claves: mínimo 10 caracteres, mayúscula, minúscula y número. */
const clave = z
  .string()
  .min(10, "Mínimo 10 caracteres")
  .max(100, "Máximo 100 caracteres")
  .regex(/[a-z]/, "Debe incluir una minúscula")
  .regex(/[A-Z]/, "Debe incluir una mayúscula")
  .regex(/\d/, "Debe incluir un número");

const usuarioBase = {
  id: z.preprocess((v) => (v === "" ? undefined : v), idNum.optional()),
  nombre: texto(60),
  apPaterno: texto(60),
  apMaterno: z.string().trim().max(60).default(""),
  correo,
  rolId: idNum,
  activo: activoSN,
};
const usuarioSchema = z.object({ ...usuarioBase, clave: z.string().max(100).default("") }).superRefine((v, ctx) => {
  if (!v.id && !v.clave) ctx.addIssue({ code: "custom", path: ["clave"], message: "Ingrese una contraseña" });
  if (v.clave) {
    const r = clave.safeParse(v.clave);
    if (!r.success) ctx.addIssue({ code: "custom", path: ["clave"], message: r.error.issues[0].message });
  }
});

export async function guardarUsuarioAction(_p: ActionState | undefined, fd: FormData): Estado {
  const actor = await requirePermission(401);
  const r = parseForm(usuarioSchema, fd);
  if (!r.ok) return r.state;
  const { id, clave: pass, ...datos } = r.data;
  const e = await conNegocio(() => (id ? cmd.actualizarUsuario(id, { ...datos, clave: pass || undefined }, actor.id) : cmd.crearUsuario({ ...datos, clave: pass })));
  if (e) return e;
  redirect(href("/admin/usuarios", { ok: id ? "guardado" : "creado" }));
}

export async function alternarUsuarioAction(id: number) {
  const actor = await requirePermission(401);
  await cmd.alternarUsuario(idNum.parse(id), actor.id);
  revalidatePath("/admin/usuarios");
}

/* -------------------------------------------------------------------- Roles */
const codigosPagina = PAGINAS.map((p) => p.codigo);

export async function guardarRolAction(_p: ActionState | undefined, fd: FormData): Estado {
  await requirePermission(402);
  const r = parseForm(
    z.object({
      id: z.preprocess((v) => (v === "" ? undefined : v), idNum.optional()),
      nombre: texto(60),
      activo: activoSN,
    }),
    fd,
  );
  if (!r.ok) return r.state;
  // Solo se aceptan códigos conocidos (se descarta cualquier otro valor enviado).
  const paginas = fd.getAll("paginas").map(Number).filter((n) => codigosPagina.includes(n));
  const estados = fd.getAll("estados").map(String).filter((e): e is EstadoCodigo => ESTADOS.some((x) => x.codigo === e));
  const e = await conNegocio(() => cmd.guardarRol(r.data.id ?? null, { nombre: r.data.nombre, paginas, estados, activo: r.data.activo }));
  if (e) return e;
  redirect(href("/admin/roles", { ok: r.data.id ? "guardado" : "creado" }));
}
