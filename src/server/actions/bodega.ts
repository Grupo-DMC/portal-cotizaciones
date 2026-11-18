"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/server/auth/dal";
import * as cmd from "@/server/data/commands";
import { ErrorNegocio } from "@/server/data/store";
import { activoSN, conNegocio, idNum, idOpc, parseForm, texto, type ActionState } from "./helpers";
import { href } from "@/lib/urls";

type Estado = Promise<ActionState | undefined>;

/* ---------------------------------------------------------------- Bodegas */
const bodegaSchema = z.object({
  id: z.preprocess((v) => (v === "" ? undefined : v), idNum.optional()),
  codigo: texto(20),
  nombre: texto(80),
});

export async function guardarBodegaAction(_p: ActionState | undefined, fd: FormData): Estado {
  await requirePermission(102);
  const r = parseForm(bodegaSchema, fd);
  if (!r.ok) return r.state;
  const e = await conNegocio(() => cmd.guardarBodega(r.data.id ?? null, r.data.codigo, r.data.nombre));
  if (e) return e;
  redirect(href("/bodega/bodegas", { ok: r.data.id ? "guardado" : "creado" }));
}

export async function alternarBodegaAction(id: number) {
  await requirePermission(102);
  await cmd.alternarBodega(idNum.parse(id));
  revalidatePath("/bodega/bodegas");
}

/* ----------------------------------------------------------------- Familias */
const familiaSchema = z.object({
  id: z.preprocess((v) => (v === "" ? undefined : v), idNum.optional()),
  codigo: texto(10),
  descripcion: texto(80),
});

export async function guardarFamiliaAction(_p: ActionState | undefined, fd: FormData): Estado {
  await requirePermission(106);
  const r = parseForm(familiaSchema, fd);
  if (!r.ok) return r.state;
  const e = await conNegocio(() => cmd.guardarFamilia(r.data.id ?? null, r.data.codigo, r.data.descripcion));
  if (e) return e;
  redirect(href("/bodega/familias", { ok: r.data.id ? "guardado" : "creado" }));
}
export async function alternarFamiliaAction(id: number) {
  await requirePermission(106);
  await cmd.alternarFamilia(idNum.parse(id));
  revalidatePath("/bodega/familias");
}

/* -------------------------------------------------------------- Subfamilias */
const subSchema = z.object({
  id: z.preprocess((v) => (v === "" ? undefined : v), idNum.optional()),
  codigo: texto(10),
  descripcion: texto(80),
  familiaId: idNum,
});

export async function guardarSubfamiliaAction(_p: ActionState | undefined, fd: FormData): Estado {
  await requirePermission(107);
  const r = parseForm(subSchema, fd);
  if (!r.ok) return r.state;
  const e = await conNegocio(() => cmd.guardarSubfamilia(r.data.id ?? null, r.data.codigo, r.data.descripcion, r.data.familiaId));
  if (e) return e;
  redirect(href("/bodega/subfamilias", { ok: r.data.id ? "guardado" : "creado" }));
}
export async function alternarSubfamiliaAction(id: number) {
  await requirePermission(107);
  await cmd.alternarSubfamilia(idNum.parse(id));
  revalidatePath("/bodega/subfamilias");
}

/* ---------------------------------------------------------------- Productos */
const productoSchema = z.object({
  id: z.preprocess((v) => (v === "" ? undefined : v), idNum.optional()),
  codigo: texto(40).regex(/^[A-Za-z0-9._\-\/]+$/, "Solo letras, números y . _ - /"),
  descripcion: texto(200),
  unidades: z.coerce.number({ error: "Valor inválido" }).int("Debe ser entero").min(1, "Mínimo 1").max(100000),
  formato: texto(30),
  familiaId: idNum,
  subfamiliaId: idOpc,
  estadoItem: z.enum(["OK", "Reparación", "Dañado"], { error: "Estado inválido" }),
  activo: activoSN,
});

const MAX_IMAGEN = 1024 * 1024;
async function leerImagen(fd: FormData): Promise<string | null | undefined> {
  const f = fd.get("imagen");
  if (!(f instanceof File) || f.size === 0) return undefined; // no se envió: conservar
  if (f.size > MAX_IMAGEN) throw new ErrorNegocio("La imagen supera 1 MB.");
  const b = Buffer.from(await f.arrayBuffer());
  // Se valida el contenido real (firma del archivo), no la extensión ni el tipo declarado.
  const png = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const webp = b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP";
  if (!png && !jpg && !webp) throw new ErrorNegocio("La imagen debe ser PNG, JPG o WebP.");
  const mime = png ? "image/png" : jpg ? "image/jpeg" : "image/webp";
  return `data:${mime};base64,${b.toString("base64")}`;
}

export async function guardarProductoAction(_p: ActionState | undefined, fd: FormData): Estado {
  const edita = fd.get("id") !== "" && fd.get("id") != null;
  await requirePermission(edita ? 104 : 105);
  const r = parseForm(productoSchema, fd);
  if (!r.ok) return r.state;
  const e = await conNegocio(async () => {
    const imagen = await leerImagen(fd);
    const datos = { ...r.data, subfamiliaId: r.data.subfamiliaId ?? null, imagen };
    if (r.data.id) await cmd.actualizarProducto(r.data.id, datos);
    else await cmd.crearProducto({ ...datos, imagen: imagen ?? null });
  });
  if (e) return e;
  redirect(href("/bodega/productos", { ok: r.data.id ? "guardado" : "creado" }));
}

/* -------------------------------------------------------------- Movimientos */
const movSchema = z.object({
  productoId: idNum,
  bodegaId: idNum,
  tipo: z.enum(["E", "S"], { error: "Seleccione entrada o salida" }),
  cantidad: z.coerce.number({ error: "Valor inválido" }).int("Debe ser entero").min(1, "Mínimo 1").max(1_000_000),
  tipoDocumento: z.enum(["Factura", "Guía de despacho", "Ajuste"], { error: "Tipo inválido" }),
  numeroDocumento: z.string().trim().max(30).default(""),
  observacion: texto(200, "Ingrese una observación"),
});

export async function registrarMovimientoAction(_p: ActionState | undefined, fd: FormData): Estado {
  const user = await requirePermission(108);
  const r = parseForm(movSchema, fd);
  if (!r.ok) return r.state;
  const e = await conNegocio(() => cmd.registrarMovimiento(r.data, user.id));
  if (e) return e;
  redirect(href("/bodega/ajuste/movimiento", { ok: "movimiento" }));
}
