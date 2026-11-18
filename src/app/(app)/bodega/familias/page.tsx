import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Pager, Filtros, Vacio, ActivoChip, OkNotice } from "@/components/ui/server";
import { Modal } from "@/components/ui/modal";
import { ActionForm, Field } from "@/components/ui/form";
import { requirePermission } from "@/server/auth/dal";
import { listarFamilias } from "@/server/data/queries";
import { alternarFamiliaAction, guardarFamiliaAction } from "@/server/actions/bodega";
import { entero, href, paginar, uno, type SearchParams } from "@/lib/urls";

export const metadata: Metadata = { title: "Familias" };
const BASE = "/bodega/familias";

export default async function Familias({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission(106);
  const sp = await searchParams;
  const q = uno(sp, "q")?.slice(0, 80);
  const todas = await listarFamilias();
  const filas = await listarFamilias(q);
  const p = paginar(filas, entero(sp, "pagina"));
  const editarId = entero(sp, "editar");
  const nueva = uno(sp, "nueva") === "1";
  const edita = editarId ? todas.find((f) => f.id === editarId) : undefined;

  return (
    <>
      <PageHead
        kicker="Bodega · clasificación"
        title="Familias"
        sub="Agrupación principal de los productos del catálogo."
        actions={<Link className="btn btn-primary" href={href(BASE, { nueva: 1 })} scroll={false}>Nueva familia</Link>}
      />
      <OkNotice ok={uno(sp, "ok")} />
      <Filtros q={q} placeholder="Código o descripción…" />
      <div className="table-wrap">
        {p.filas.length === 0 ? (
          <Vacio>No hay familias que coincidan.</Vacio>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Código</th><th>Descripción</th><th>Estado</th><th className="r"><span className="sr-only">Funciones</span></th></tr>
            </thead>
            <tbody>
              {p.filas.map((f) => (
                <tr key={f.id}>
                  <td className="strong">{f.codigo}</td>
                  <td>{f.descripcion}</td>
                  <td><ActivoChip activo={f.activo} /></td>
                  <td className="r">
                    <div className="row-actions">
                      <Link className="link-action" href={href(BASE, { editar: f.id, q })} scroll={false}>Editar</Link>
                      <form action={alternarFamiliaAction.bind(null, f.id)}>
                        <button className="link-action" type="submit">{f.activo ? "Desactivar" : "Activar"}</button>
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
        <Modal title={edita ? "Editar familia" : "Nueva familia"} closeHref={href(BASE, { q })}>
          <ActionForm action={guardarFamiliaAction} cancelHref={href(BASE, { q })}>
            <input type="hidden" name="id" value={edita?.id ?? ""} />
            <div className="form-grid">
              <Field name="codigo" label="Código" required defaultValue={edita?.codigo} maxLength={10} />
              <Field name="descripcion" label="Descripción" required defaultValue={edita?.descripcion} maxLength={80} />
            </div>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
