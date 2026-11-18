import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead, Pager, Filtros, Vacio } from "@/components/ui/server";
import { puede, requirePermission } from "@/server/auth/dal";
import { clientePorId, listaPorId, preciosDeLista } from "@/server/data/queries";
import { entero, paginar, uno, type SearchParams } from "@/lib/urls";
import { formatCLP } from "@/lib/format";

export const metadata: Metadata = { title: "Precios del cliente" };

export default async function PreciosCliente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const user = await requirePermission(201);
  const { id } = await params;
  const cliente = /^\d{1,9}$/.test(id) ? await clientePorId(Number(id)) : null;
  if (!cliente) notFound();
  const sp = await searchParams;
  const q = uno(sp, "q")?.slice(0, 80);
  const lista = await listaPorId(cliente.listaPrecioId);
  const filas = await preciosDeLista(cliente.listaPrecioId, q);
  const p = paginar(filas, entero(sp, "pagina"));
  const base = `/comercial/clientes/${cliente.id}/precios`;

  return (
    <>
      <PageHead
        kicker={`Comercial · ${cliente.razonSocial}`}
        title="Precios del cliente"
        sub={`Lista asignada: ${lista?.descripcion ?? "—"}. Estos son los valores que se cargan al cotizar.`}
        actions={
          <>
            <Link className="btn" href="/comercial/clientes">Volver a clientes</Link>
            {puede(user, 202) && lista && <Link className="btn" href={`/comercial/precios/${lista.id}`}>Editar la lista</Link>}
          </>
        }
      />
      <Filtros q={q} placeholder="Código o descripción…" />
      <div className="table-wrap">
        {p.filas.length === 0 ? (
          <Vacio>No hay productos con precio en esta lista.</Vacio>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Código</th><th>Descripción</th><th className="r">Precio lista</th><th className="r">Precio venta</th></tr>
            </thead>
            <tbody>
              {p.filas.map((x) => (
                <tr key={x.productoId}>
                  <td className="strong">{x.codigo}</td>
                  <td>{x.descripcion}</td>
                  <td className="r">{formatCLP(x.precioLista)}</td>
                  <td className="r strong">{formatCLP(x.precioVenta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pager base={base} params={{ q }} actual={p.actual} paginas={p.paginas} total={p.total} tam={p.tam} />
    </>
  );
}
