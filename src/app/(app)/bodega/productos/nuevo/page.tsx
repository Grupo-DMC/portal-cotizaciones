import type { Metadata } from "next";
import { PageHead } from "@/components/ui/server";
import { ProductoForm } from "@/components/producto-form";
import { requirePermission } from "@/server/auth/dal";
import { listarFamilias, listarSubfamilias } from "@/server/data/queries";

export const metadata: Metadata = { title: "Agregar producto" };

export default async function NuevoProducto() {
  await requirePermission(105);
  const [familias, subfamilias] = await Promise.all([listarFamilias(), listarSubfamilias()]);
  return (
    <>
      <PageHead kicker="Bodega · maestro de productos" title="Agregar producto" sub="El producto queda disponible en todas las listas de precios con valor $ 0 hasta que lo ajuste en Listas de precios." />
      <div className="panel" style={{ maxWidth: 820 }}>
        <div className="panel-body">
          <ProductoForm familias={familias.filter((f) => f.activo)} subfamilias={subfamilias.filter((s) => s.activo)} cancelHref="/bodega/productos" />
        </div>
      </div>
    </>
  );
}
