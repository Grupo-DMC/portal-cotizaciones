import type { Metadata } from "next";
import { PageHead, Pager, Vacio } from "@/components/ui/server";
import { requirePermission } from "@/server/auth/dal";
import { listarBodegas, movimientosFiltrados, productosActivos, productoPorId } from "@/server/data/queries";
import { entero, paginar, type SearchParams } from "@/lib/urls";
import { formatFecha, formatNum } from "@/lib/format";

export const metadata: Metadata = { title: "Movimientos por producto" };

export default async function Movimientos({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission(103);
  const sp = await searchParams;
  const productoId = entero(sp, "producto");
  const bodegaId = entero(sp, "bodega");
  const [filas, productos, bodegas, prod] = await Promise.all([
    movimientosFiltrados(productoId, bodegaId),
    productosActivos(),
    listarBodegas(),
    productoId ? productoPorId(productoId) : null,
  ]);
  const p = paginar(filas, entero(sp, "pagina"));
  const entradas = filas.reduce((t, m) => t + m.entrada, 0);
  const salidas = filas.reduce((t, m) => t + m.salida, 0);

  return (
    <>
      <PageHead
        kicker="Bodega"
        title="Movimientos por producto"
        sub={prod ? `Kardex de ${prod.codigo} — ${prod.descripcion}` : "Kardex: cada entrada y salida de inventario, con su documento y responsable."}
      />
      <form method="get" className="filters">
        <div className="field grow">
          <label htmlFor="producto">Producto</label>
          <select id="producto" name="producto" className="select" defaultValue={productoId ?? ""}>
            <option value="">Todos los productos</option>
            {productos.map((x) => (
              <option key={x.id} value={x.id}>{x.codigo} · {x.descripcion}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bodega">Bodega</label>
          <select id="bodega" name="bodega" className="select" defaultValue={bodegaId ?? ""}>
            <option value="">Todas</option>
            {bodegas.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn">Filtrar</button>
      </form>

      <div className="table-wrap">
        {p.filas.length === 0 ? (
          <Vacio>No hay movimientos para este filtro.</Vacio>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Bodega</th>
                <th>Documento</th>
                <th className="r">Entrada</th>
                <th className="r">Salida</th>
                <th>Observaciones</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {p.filas.map((m) => (
                <tr key={m.id}>
                  <td className="nowrap">{formatFecha(m.fecha)}</td>
                  <td className="strong">{m.codigo}</td>
                  <td>{m.bodega}</td>
                  <td>{m.tipoDocumento}{m.numeroDocumento ? ` N° ${m.numeroDocumento}` : ""}</td>
                  <td className="r">{m.entrada ? formatNum(m.entrada) : <span className="muted">—</span>}</td>
                  <td className="r">{m.salida ? formatNum(m.salida) : <span className="muted">—</span>}</td>
                  <td>{m.observacion}</td>
                  <td>{m.usuario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pager base="/bodega/movimientos" params={{ producto: productoId, bodega: bodegaId }} actual={p.actual} paginas={p.paginas} total={p.total} tam={p.tam} />
      {filas.length > 0 && (
        <p style={{ marginTop: 10, fontSize: 13.5, color: "var(--color-ink-soft)" }}>
          Totales del filtro: {formatNum(entradas)} entradas · {formatNum(salidas)} salidas · saldo {formatNum(entradas - salidas)}
        </p>
      )}
    </>
  );
}
