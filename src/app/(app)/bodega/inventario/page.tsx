import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Pager, Filtros, Vacio } from "@/components/ui/server";
import { requirePermission } from "@/server/auth/dal";
import { inventario, listarFamilias } from "@/server/data/queries";
import { STOCK_CRITICO } from "@/server/data/types";
import { entero, href, paginar, uno, type SearchParams } from "@/lib/urls";
import { formatNum } from "@/lib/format";

export const metadata: Metadata = { title: "Inventario" };

export default async function Inventario({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission(101);
  const sp = await searchParams;
  const q = uno(sp, "q")?.slice(0, 80);
  const familiaId = entero(sp, "familia");
  const [filas, familias] = await Promise.all([inventario(q, familiaId), listarFamilias()]);
  const p = paginar(filas, entero(sp, "pagina"));
  const params = { q, familia: familiaId };

  return (
    <>
      <PageHead
        kicker="Bodega"
        title="Inventario"
        sub="Saldo total por producto, sumando todas las bodegas."
        actions={<a className="btn" href={href("/api/export/inventario", params)}>Exportar CSV</a>}
      />
      <Filtros q={q} placeholder="Código, descripción o familia…">
        <div className="field">
          <label htmlFor="familia">Familia</label>
          <select id="familia" name="familia" className="select" defaultValue={familiaId ?? ""}>
            <option value="">Todas</option>
            {familias.map((f) => (
              <option key={f.id} value={f.id}>{f.codigo} · {f.descripcion}</option>
            ))}
          </select>
        </div>
      </Filtros>

      <div className="table-wrap">
        {p.filas.length === 0 ? (
          <Vacio>No hay productos que coincidan con el filtro.</Vacio>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Familia</th>
                <th>Código</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th className="r">Saldo total</th>
                <th className="r"><span className="sr-only">Funciones</span></th>
              </tr>
            </thead>
            <tbody>
              {p.filas.map((x) => (
                <tr key={x.id}>
                  <td className="muted">{x.codigoFamilia}</td>
                  <td className="strong">{x.codigo}</td>
                  <td>{x.descripcion}</td>
                  <td>{x.estadoItem}</td>
                  <td className="r strong" style={x.total <= STOCK_CRITICO ? { color: "var(--color-accent-ink)" } : undefined}>
                    {formatNum(x.total)}
                  </td>
                  <td className="r">
                    <div className="row-actions">
                      <Link className="link-action" href={href("/bodega/movimientos", { producto: x.id })}>Movimientos</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pager base="/bodega/inventario" params={params} actual={p.actual} paginas={p.paginas} total={p.total} tam={p.tam} />
    </>
  );
}
