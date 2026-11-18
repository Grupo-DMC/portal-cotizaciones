"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/server/auth/dal";
import * as cmd from "@/server/data/commands";
import { activoSN, conNegocio, correo, idNum, idOpc, monto, parseForm, texto, textoOpc, type ActionState } from "./helpers";
import { href } from "@/lib/urls";
import { REGIONES } from "@/lib/permisos";
import { formatearRut, limpiarRut, validarRut } from "@/lib/rut";

type Estado = Promise<ActionState | undefined>;
const regionValida = REGIONES.map((r) => r.value) as string[];
const region = z.string().refine((v) => regionValida.includes(v), "Seleccione una región");
const telefono = z.string().trim().max(30).regex(/^[0-9+()\-\s]*$/, "Teléfono inválido").default("");
const emailOpc = z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.union([z.literal(""), correo])).default("");

/* ----------------------------------------------------------------- Clientes */
const clienteSchema = z.object({
  id: z.preprocess((v) => (v === "" ? undefined : v), idNum.optional()),
  rut: z.string().trim().min(1, "Ingrese el RUT").refine(validarRut, "RUT inválido (revise el dígito verificador)"),
  razonSocial: texto(120),
  contacto: textoOpc(80),
  telefono,
  email: emailOpc,
  direccion: texto(150),
  comuna: texto(60),
  region,
  ejecutivoId: idOpc,
  listaPrecioId: idNum,
  activo: activoSN,
});

export async function guardarClienteAction(_p: ActionState | undefined, fd: FormData): Estado {
  await requirePermission(201);
  const r = parseForm(clienteSchema, fd);
  if (!r.ok) return r.state;
  const { id, ...resto } = r.data;
  const datos = { ...resto, rut: formatearRut(limpiarRut(resto.rut)), ejecutivoId: resto.ejecutivoId ?? null };
  const e = await conNegocio(() => (id ? cmd.actualizarCliente(id, datos) : cmd.crearCliente(datos)));
  if (e) return e;
  redirect(href("/comercial/clientes", { ok: id ? "guardado" : "creado" }));
}

export async function alternarClienteAction(id: number) {
  await requirePermission(201);
  await cmd.alternarCliente(idNum.parse(id));
  revalidatePath("/comercial/clientes");
}

/* --------------------------------------------------------------- Sucursales */
const sucursalSchema = z.object({
  clienteId: idNum,
  id: z.preprocess((v) => (v === "" ? undefined : v), idNum.optional()),
  nombre: texto(80),
  direccion: texto(150),
  comuna: texto(60),
  region,
  encargado: textoOpc(80),
  telefonoEncargado: telefono,
  emailEncargado: emailOpc,
  casaMatriz: activoSN,
  activo: activoSN,
});

export async function guardarSucursalAction(_p: ActionState | undefined, fd: FormData): Estado {
  await requirePermission(201);
  const r = parseForm(sucursalSchema, fd);
  if (!r.ok) return r.state;
  const { clienteId, id, ...datos } = r.data;
  const e = await conNegocio(() => cmd.guardarSucursal(clienteId, id ?? null, datos));
  if (e) return e;
  redirect(href(`/comercial/clientes/${clienteId}/sucursales`, { ok: id ? "guardado" : "creado" }));
}

/* ------------------------------------------------------------------- Listas */
const listaSchema = z.object({
  id: z.preprocess((v) => (v === "" ? undefined : v), idNum.optional()),
  descripcion: texto(80),
  activo: activoSN,
});

export async function guardarListaAction(_p: ActionState | undefined, fd: FormData): Estado {
  await requirePermission(202);
  const r = parseForm(listaSchema, fd);
  if (!r.ok) return r.state;
  const e = await conNegocio(() => (r.data.id ? cmd.actualizarLista(r.data.id, r.data.descripcion, r.data.activo) : cmd.crearLista(r.data.descripcion)));
  if (e) return e;
  redirect(href("/comercial/precios", { ok: r.data.id ? "guardado" : "creado" }));
}

const precioSchema = z
  .object({ listaId: idNum, productoId: idNum, precioLista: monto, precioVenta: monto })
  .refine((v) => v.precioVenta <= v.precioLista || v.precioLista === 0, { path: ["precioVenta"], message: "El precio de venta no puede superar el precio de lista" });

export async function guardarPrecioAction(_p: ActionState | undefined, fd: FormData): Estado {
  await requirePermission(202);
  const r = parseForm(precioSchema, fd);
  if (!r.ok) return r.state;
  const e = await conNegocio(() => cmd.guardarPrecio(r.data.listaId, r.data.productoId, r.data.precioLista, r.data.precioVenta));
  if (e) return e;
  redirect(href(`/comercial/precios/${r.data.listaId}`, { ok: "guardado" }));
}
