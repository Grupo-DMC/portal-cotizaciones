import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/ui/server";
import { puede, requirePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Emitir documento" };

export default async function Emitir() {
  const user = await requirePermission(301);
  return (
    <>
      <PageHead kicker="Documentos" title="Emitir documento" sub="Elija el tipo de documento que desea generar." />
      <div className="cards-nav">
        <Link href="/documentos/cotizacion" className="card-link">
          <h2>Cotización</h2>
          <p>Cotice productos a un cliente con los precios de su lista, descuentos por línea y PDF listo para enviar.</p>
        </Link>
        <div className="card-link" aria-disabled="true" style={{ opacity: 0.55, cursor: "default", borderTopColor: "var(--color-line-input)" }}>
          <h2>Factura</h2>
          <p>Próximamente. Hoy las facturas se emiten desde el sistema de facturación electrónica.</p>
        </div>
        {puede(user, 302) && (
          <Link href="/documentos" className="card-link">
            <h2>Ver listado</h2>
            <p>Revise, edite, clone o descargue en PDF los documentos ya emitidos.</p>
          </Link>
        )}
      </div>
    </>
  );
}
