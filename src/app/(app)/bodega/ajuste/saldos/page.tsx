import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Pager, Filtros, Vacio } from "@/components/ui/server";
import { requirePermission } from "@/server/auth/dal";
import { saldosGenerales } from "@/server/data/queries";
import { STOCK_CRITICO } from "@/server/data/types";
import { entero, href, paginar, uno, type SearchParams } from "@/lib/urls";
import { formatNum } from "@/lib/format";

export const metadata: Metadata = { title: "Saldos generales" };

export default async function Saldos({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission(108);
  const sp = await searchParams;
  const q = uno(sp, "q")?.slice(0, 80);
  const filas = await saldosGenerales(q);
  const p = paginar(filas, entero(sp, "pagina"));

  return (
    <>
      <PageHead
        kicker="Bodega · ajuste de inventario"
        title="Saldo general de inventario"
        actions={
          <>
            <Link className="btn" href="/bodega/ajuste">Volver</Link>
            <a className="btn" href={href("/api/export/saldos", { q })}>Exportar CSV</a>
          </>
        }
      />
      <Filtros q={q} placeholder="Código o descripción…" />
      <div className="table-wrap">
        {p.filas.length === 0 ? (
          <Vacio>No hay productos que coincidan.</Vacio>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Código</th><th>Descripción</th><th className="r">Entradas</th><th className="r">Salidas</th><th className="r">Saldo</th></tr>
            </thead>
            <tbody>
              {p.filas.map((x) => (
                <tr key={x.id}>
                  <td className="strong">{x.codigo}</td>
                  <td>{x.descripcion}</td>
                  <td className="r">{formatNum(x.entradas)}</td>
                  <td className="r">{formatNum(x.salidas)}</td>
                  <td className="r strong" style={x.total <= STOCK_CRITICO ? { color: "var(--color-accent-ink)" } : undefined}>{formatNum(x.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pager base="/bodega/ajuste/saldos" params={{ q }} actual={p.actual} paginas={p.paginas} total={p.total} tam={p.tam} />
    </>
  );
}
