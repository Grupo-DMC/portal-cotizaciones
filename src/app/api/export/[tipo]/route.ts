import { NextResponse } from "next/server";
import { getSessionUser, puede } from "@/server/auth/dal";
import { inventario, listarClientes, saldosGenerales } from "@/server/data/queries";

export const runtime = "nodejs";

/**
 * Exporta CSV (UTF-8 con BOM, se abre directo en Excel).
 * Protección contra inyección de fórmulas: las celdas de texto que empiezan con = + - @ se prefijan con '.
 */
function celda(v: string | number | boolean | null | undefined): string {
  let s = v == null ? "" : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const fila = (xs: (string | number | boolean | null | undefined)[]) => xs.map(celda).join(";");

export async function GET(req: Request, ctx: { params: Promise<{ tipo: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { tipo } = await ctx.params;
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.slice(0, 80) || undefined;
  const fam = /^\d{1,9}$/.test(url.searchParams.get("familia") ?? "") ? Number(url.searchParams.get("familia")) : undefined;

  let lineas: string[];
  if (tipo === "inventario" && puede(user, 101)) {
    const xs = await inventario(q, fam);
    lineas = [fila(["Familia", "Código", "Descripción", "Estado", "Saldo total"]), ...xs.map((x) => fila([x.codigoFamilia, x.codigo, x.descripcion, x.estadoItem, x.total]))];
  } else if (tipo === "saldos" && puede(user, 108)) {
    const xs = await saldosGenerales(q);
    lineas = [fila(["Código", "Descripción", "Entradas", "Salidas", "Saldo"]), ...xs.map((x) => fila([x.codigo, x.descripcion, x.entradas, x.salidas, x.total]))];
  } else if (tipo === "clientes" && puede(user, 201)) {
    const xs = await listarClientes(q);
    lineas = [
      fila(["RUT", "Razón social", "Contacto", "Teléfono", "Email", "Dirección", "Comuna", "Región", "Lista de precios", "Activo"]),
      ...xs.map((x) => fila([x.rut, x.razonSocial, x.contacto, x.telefono, x.email, x.direccion, x.comuna, x.region, x.lista, x.activo ? "Sí" : "No"])),
    ];
  } else {
    return NextResponse.json({ error: "Exportación no disponible o sin permiso" }, { status: 403 });
  }

  return new NextResponse("﻿" + lineas.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tipo}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
