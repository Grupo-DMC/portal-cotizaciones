"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/server/auth/dal";
import * as cmd from "@/server/data/commands";
import { documentoPorId } from "@/server/data/queries";
import { conNegocio, idNum, idOpc, textoOpc, type ActionState } from "./helpers";
import { href } from "@/lib/urls";
import { ESTADOS, type EstadoCodigo } from "@/server/data/types";

type Estado = Promise<ActionState | undefined>;

const lineaSchema = z.object({
  productoId: idNum,
  descripcion: z.string().trim().max(200),
  cantidad: z.number().int().min(1, "La cantidad debe ser al menos 1").max(1_000_000),
  valorNeto: z.number().int().min(1, "El precio base debe ser mayor a 0").max(2_000_000_000),
  descuento: z.number().min(0, "El descuento no puede ser negativo").max(100, "El descuento no puede superar 100%"),
});

const cotizacionSchema = z.object({
  modo: z.enum(["nueva", "editar"]),
  documentoId: idOpc,
  clienteId: idNum,
  sucursalId: idOpc,
  proyecto: textoOpc(150),
  fecha: z.iso.date("Fecha inválida"),
  observaciones: textoOpc(1000),
});

export async function guardarCotizacionAction(_p: ActionState | undefined, fd: FormData): Estado {
  const user = await requirePermission(301);

  const base = cotizacionSchema.safeParse(Object.fromEntries(fd));
  if (!base.success) return { error: "Revise los datos del documento (cliente y fecha son obligatorios)." };

  let lineasCrudas: unknown;
  try {
    const s = String(fd.get("lineas") ?? "");
    if (s.length > 200_000) throw new Error("grande");
    lineasCrudas = JSON.parse(s);
  } catch {
    return { error: "No se pudo leer el detalle de productos." };
  }
  const lineas = z.array(lineaSchema).min(1, "Agregue al menos una línea de producto.").max(100, "Máximo 100 líneas por documento.").safeParse(lineasCrudas);
  if (!lineas.success) {
    const m = lineas.error.issues[0];
    const n = typeof m.path[0] === "number" ? ` (línea ${m.path[0] + 1})` : "";
    return { error: `${m.message}${n}` };
  }
  const d = base.data;
  if (d.modo === "editar" && !d.documentoId) return { error: "Falta el documento a editar." };

  let resultado: { id: number; folio: number } | undefined;
  const e = await conNegocio(async () => {
    resultado = await cmd.guardarCotizacion(
      { clienteId: d.clienteId, sucursalId: d.sucursalId, proyecto: d.proyecto, fecha: d.fecha, observaciones: d.observaciones, lineas: lineas.data },
      user.id,
      d.modo === "editar" ? { tipo: "editar", id: d.documentoId! } : { tipo: "nueva" },
    );
  });
  if (e) return e;
  redirect(href("/documentos", { ok: d.modo === "editar" ? "cot-actualizada" : "cot-creada", folio: resultado!.folio, pdf: resultado!.id }));
}

export async function cambiarEstadoAction(_p: ActionState | undefined, fd: FormData): Estado {
  const user = await requirePermission(302);
  const r = z
    .object({ id: idNum, estado: z.enum(ESTADOS.map((e) => e.codigo) as [EstadoCodigo, ...EstadoCodigo[]], { error: "Seleccione un estado" }) })
    .safeParse(Object.fromEntries(fd));
  if (!r.success) return { error: "Seleccione un estado válido." };
  // El rol solo puede asignar los estados que tiene autorizados (antes solo se filtraba el combo).
  if (!user.rol.estados.includes(r.data.estado)) return { error: "Su rol no puede asignar ese estado." };
  const e = await conNegocio(() => cmd.cambiarEstado(r.data.id, r.data.estado, user.id));
  if (e) return e;
  redirect(href("/documentos", { ok: "estado" }));
}

export async function eliminarDocumentoAction(id: number) {
  const user = await requirePermission(302);
  const doc = await documentoPorId(idNum.parse(id));
  if (!doc) redirect(href("/documentos", { ok: "eliminado" }));
  await cmd.eliminarDocumento(doc.id, user.id);
  redirect(href("/documentos", { ok: "eliminado" }));
}
