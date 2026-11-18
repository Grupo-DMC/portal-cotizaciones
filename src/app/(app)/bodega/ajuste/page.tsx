import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/ui/server";
import { requirePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Ajuste de inventario" };

export default async function Ajuste() {
  await requirePermission(108);
  return (
    <>
      <PageHead kicker="Bodega" title="Gestión de saldos" sub="Registre entradas y salidas, o revise el saldo general de cada producto." />
      <div className="cards-nav">
        <Link href="/bodega/ajuste/movimiento" className="card-link">
          <h2>Ingresar movimiento</h2>
          <p>Registrar una entrada o una salida de un producto en una bodega. Queda en el kardex con su responsable.</p>
        </Link>
        <Link href="/bodega/ajuste/saldos" className="card-link">
          <h2>Saldos generales</h2>
          <p>Entradas, salidas y saldo acumulado de todos los productos.</p>
        </Link>
      </div>
    </>
  );
}
