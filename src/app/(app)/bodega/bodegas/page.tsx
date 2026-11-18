import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Pager, Filtros, Vacio, ActivoChip, OkNotice } from "@/components/ui/server";
import { Modal } from "@/components/ui/modal";
import { ActionForm, Field } from "@/components/ui/form";
import { requirePermission } from "@/server/auth/dal";
import { listarBodegas } from "@/server/data/queries";
import { alternarBodegaAction, guardarBodegaAction } from "@/server/actions/bodega";
import { entero, href, paginar, uno, type SearchParams } from "@/lib/urls";

export const metadata: Metadata = { title: "Bodegas" };
const BASE = "/bodega/bodegas";

export default async function Bodegas({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission(102);
  const sp = await searchParams;
  const q = uno(sp, "q")?.slice(0, 80);
  const filas = await listarBodegas(q);
  const p = paginar(filas, entero(sp, "pagina"));
  const editarId = entero(sp, "editar");
  const nueva = uno(sp, "nueva") === "1";
  const edita = editarId ? filas.find((b) => b.id === editarId) ?? (await listarBodegas()).find((b) => b.id === editarId) : undefined;

  return (
    <>
      <PageHead
        kicker="Bodega"
        title="Bodegas"
        sub="Ubicaciones donde se lleva el saldo de productos."
        actions={<Link className="btn btn-primary" href={href(BASE, { nueva: 1 })} scroll={false}>Nueva bodega</Link>}
      />
      <OkNotice ok={uno(sp, "ok")} />
      <Filtros q={q} placeholder="Código o nombre de bodega…" />

      <div className="table-wrap">
        {p.filas.length === 0 ? (
          <Vacio>No hay bodegas que coincidan.</Vacio>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th className="r"><span className="sr-only">Funciones</span></th>
              </tr>
            </thead>
            <tbody>
              {p.filas.map((b) => (
                <tr key={b.id}>
                  <td className="strong">{b.codigo}</td>
                  <td>{b.nombre}</td>
                  <td><ActivoChip activo={b.activo} /></td>
                  <td className="r">
                    <div className="row-actions">
                      <Link className="link-action" href={href(BASE, { editar: b.id, q })} scroll={false}>Editar</Link>
                      <form action={alternarBodegaAction.bind(null, b.id)}>
                        <button className="link-action" type="submit">{b.activo ? "Desactivar" : "Activar"}</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pager base={BASE} params={{ q }} actual={p.actual} paginas={p.paginas} total={p.total} tam={p.tam} />

      {(edita || nueva) && (
        <Modal title={edita ? "Editar bodega" : "Nueva bodega"} closeHref={href(BASE, { q })}>
          <ActionForm action={guardarBodegaAction} cancelHref={href(BASE, { q })}>
            <input type="hidden" name="id" value={edita?.id ?? ""} />
            <div className="form-grid">
              <Field name="codigo" label="Código" required defaultValue={edita?.codigo} maxLength={20} />
              <Field name="nombre" label="Nombre" required defaultValue={edita?.nombre} maxLength={80} />
            </div>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
