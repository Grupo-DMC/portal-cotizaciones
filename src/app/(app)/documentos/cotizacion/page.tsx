import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui/server";
import { CotizacionEditor, type ClienteOpc, type Inicial } from "@/components/cotizacion-editor";
import { requirePermission } from "@/server/auth/dal";
import { documentoPorId, folioSiguiente, listarClientes, listarListas, mapaPrecios, productosActivos, saldoTotal, sucursalesDeCliente } from "@/server/data/queries";
import { entero, href, type SearchParams } from "@/lib/urls";

export const metadata: Metadata = { title: "Cotización" };

export default async function Cotizacion({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission(301);
  const sp = await searchParams;
  const editarId = entero(sp, "editar");
  const clonarId = entero(sp, "clonar");
  const origenId = editarId ?? clonarId;
  const origen = origenId ? await documentoPorId(origenId) : null;

  if (origenId && !origen) redirect(href("/documentos", { ok: "no-existe" }));
  if (origen && editarId && ["F", "DP", "DT"].includes(origen.estado)) redirect(href("/documentos", { ok: "no-editable", folio: origen.folio }));

  const [clientes, listas, productos, precios, folioNuevo] = await Promise.all([listarClientes(), listarListas(), productosActivos(), mapaPrecios(), folioSiguiente()]);
  const nombreLista = new Map(listas.map((l) => [l.id, l.descripcion]));

  const clientesOpc: ClienteOpc[] = await Promise.all(
    clientes
      .filter((c) => c.activo || c.id === origen?.clienteId)
      .map(async (c) => ({
        id: c.id, razonSocial: c.razonSocial, rut: c.rut, direccion: c.direccion, email: c.email, region: c.region, telefono: c.telefono,
        listaPrecioId: c.listaPrecioId, listaNombre: nombreLista.get(c.listaPrecioId) ?? "—",
        sucursales: (await sucursalesDeCliente(c.id)).filter((s) => s.activo || s.id === origen?.sucursalId).map((s) => ({ id: s.id, nombre: s.nombre, direccion: s.direccion, casaMatriz: s.casaMatriz })),
      })),
  );

  const inicial: Inicial | undefined = origen
    ? {
        clienteId: origen.clienteId,
        sucursalId: origen.sucursalId,
        proyecto: origen.proyecto,
        // Al clonar, la fecha es la de hoy; al editar, se conserva la original.
        fecha: editarId ? origen.fecha : new Date().toISOString().slice(0, 10),
        observaciones: origen.observaciones,
        lineas: origen.lineas.map((l) => ({ productoId: l.productoId, descripcion: l.descripcion, cantidad: l.cantidad, valorNeto: l.valorNeto, descuento: l.descuento })),
      }
    : undefined;

  return (
    <>
      <PageHead
        kicker="Documentos"
        title={editarId && origen ? `Editar cotización ${origen.folio}` : clonarId ? "Nueva cotización (copia)" : "Nueva cotización"}
        sub={editarId ? "Los totales se recalculan al guardar." : "El folio definitivo se asigna al guardar, de forma correlativa."}
      />
      <CotizacionEditor
        modo={editarId && origen ? "editar" : "nueva"}
        documentoId={editarId && origen ? origen.id : undefined}
        folio={editarId && origen ? origen.folio : folioNuevo}
        clientes={clientesOpc}
        productos={productos.map((p) => ({ id: p.id, codigo: p.codigo, descripcion: p.descripcion, stock: saldoTotal(p.id) }))}
        precios={precios}
        inicial={inicial}
      />
    </>
  );
}
