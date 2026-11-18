import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHead, Pager, Filtros, Vacio, ActivoChip, OkNotice } from "@/components/ui/server";
import { Modal } from "@/components/ui/modal";
import { ProductoForm } from "@/components/producto-form";
import { puede, requirePermission } from "@/server/auth/dal";
import { listarFamilias, listarProductos, listarSubfamilias, productoPorId, saldoPorBodega } from "@/server/data/queries";
import { entero, href, paginar, uno, type SearchParams } from "@/lib/urls";
import { formatNum } from "@/lib/format";

export const metadata: Metadata = { title: "Maestro de productos" };
const BASE = "/bodega/productos";

export default async function Productos({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission(104);
  const sp = await searchParams;
  const q = uno(sp, "q")?.slice(0, 80);
  const familiaId = entero(sp, "familia");
  const [filas, familias] = await Promise.all([listarProductos(q, familiaId), listarFamilias()]);
  const p = paginar(filas, entero(sp, "pagina"));
  const editarId = entero(sp, "editar");
  const edita = editarId ? await productoPorId(editarId) : null;
  const [subfamilias, saldos] = edita ? await Promise.all([listarSubfamilias(), saldoPorBodega(edita.id)]) : [[], []];
  const params = { q, familia: familiaId };

  return (
    <>
      <PageHead
        kicker="Bodega"
        title="Maestro de productos"
        sub="Catálogo completo: datos comerciales, clasificación e imagen."
        actions={puede(user, 105) ? <Link className="btn btn-primary" href="/bodega/productos/nuevo">Agregar producto</Link> : null}
      />
      <OkNotice ok={uno(sp, "ok")} />
      <Filtros q={q} placeholder="Código, descripción, familia…">
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
          <Vacio>No hay productos que coincidan.</Vacio>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th><span className="sr-only">Imagen</span></th>
                <th>Código</th>
                <th>Descripción</th>
                <th>Formato</th>
                <th>Familia</th>
                <th>Subfamilia</th>
                <th>Estado</th>
                <th>Activo</th>
                <th className="r"><span className="sr-only">Funciones</span></th>
              </tr>
            </thead>
            <tbody>
              {p.filas.map((x) => (
                <tr key={x.id}>
                  <td>{x.imagen ? <Image className="thumb" src={x.imagen} alt="" width={38} height={38} unoptimized /> : <span className="thumb" aria-hidden="true" style={{ background: "var(--color-bg)" }} />}</td>
                  <td className="strong">{x.codigo}</td>
                  <td>{x.descripcion}</td>
                  <td className="muted">{x.formato}</td>
                  <td>{x.familia}</td>
                  <td className="muted">{x.subfamilia}</td>
                  <td>{x.estadoItem}</td>
                  <td><ActivoChip activo={x.activo} /></td>
                  <td className="r">
                    <div className="row-actions">
                      <Link className="link-action" href={href(BASE, { ...params, editar: x.id })} scroll={false}>Editar</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pager base={BASE} params={params} actual={p.actual} paginas={p.paginas} total={p.total} tam={p.tam} />

      {edita && (
        <Modal title={`Editar ${edita.codigo}`} closeHref={href(BASE, params)} wide>
          <ProductoForm producto={edita} familias={familias} subfamilias={subfamilias} cancelHref={href(BASE, params)} />
          <h3 style={{ margin: "26px 0 10px" }}>Saldo por bodega</h3>
          {saldos.length === 0 ? (
            <p className="muted" style={{ color: "var(--color-ink-soft)" }}>Este producto no tiene movimientos en ninguna bodega.</p>
          ) : (
            <table className="tbl" style={{ border: "1px solid var(--color-line)" }}>
              <thead>
                <tr><th>Bodega</th><th className="r">Entradas</th><th className="r">Salidas</th><th className="r">Saldo</th></tr>
              </thead>
              <tbody>
                {saldos.map((s) => (
                  <tr key={s.bodega.id}>
                    <td>{s.bodega.nombre}</td>
                    <td className="r">{formatNum(s.entradas)}</td>
                    <td className="r">{formatNum(s.salidas)}</td>
                    <td className="r strong">{formatNum(s.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </>
  );
}
