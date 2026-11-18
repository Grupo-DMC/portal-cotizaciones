import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, OkNotice } from "@/components/ui/server";
import { ActionForm, Field } from "@/components/ui/form";
import { requirePermission } from "@/server/auth/dal";
import { listarBodegas, productosActivos, saldoTotal } from "@/server/data/queries";
import { registrarMovimientoAction } from "@/server/actions/bodega";
import { uno, type SearchParams } from "@/lib/urls";

export const metadata: Metadata = { title: "Ingresar movimiento" };

export default async function IngresarMovimiento({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission(108);
  const sp = await searchParams;
  const [productos, bodegas] = await Promise.all([productosActivos(), listarBodegas()]);

  return (
    <>
      <PageHead
        kicker="Bodega · ajuste de inventario"
        title="Ingresar movimiento"
        sub="Una salida no puede superar el saldo disponible en la bodega elegida."
        actions={<Link className="btn" href="/bodega/ajuste">Volver</Link>}
      />
      <OkNotice ok={uno(sp, "ok")} />
      <div className="panel" style={{ maxWidth: 820 }}>
        <div className="panel-body">
          <ActionForm action={registrarMovimientoAction} submitLabel="Registrar movimiento" cancelHref="/bodega/ajuste">
            <div className="form-grid">
              <Field
                name="productoId" label="Producto" as="select" required className="full" vacio="Seleccione un producto"
                options={productos.map((p) => ({ value: p.id, label: `${p.codigo} · ${p.descripcion} (saldo ${saldoTotal(p.id)})` }))}
              />
              <Field name="bodegaId" label="Bodega" as="select" required options={bodegas.filter((b) => b.activo).map((b) => ({ value: b.id, label: b.nombre }))} />
              <Field name="tipo" label="Tipo de movimiento" as="select" required options={[{ value: "E", label: "Entrada (suma al saldo)" }, { value: "S", label: "Salida (resta del saldo)" }]} />
              <Field name="cantidad" label="Cantidad" type="number" required min={1} inputMode="numeric" defaultValue={1} />
              <Field name="tipoDocumento" label="Documento de respaldo" as="select" required options={[{ value: "Ajuste", label: "Ajuste interno" }, { value: "Factura", label: "Factura" }, { value: "Guía de despacho", label: "Guía de despacho" }]} />
              <Field name="numeroDocumento" label="N° de documento" maxLength={30} hint="Opcional para ajustes internos." />
              <Field name="observacion" label="Observación" as="textarea" required maxLength={200} className="full" rows={3} placeholder="Motivo del movimiento" />
            </div>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
