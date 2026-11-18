import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Pager, Filtros, Vacio, ActivoChip, OkNotice } from "@/components/ui/server";
import { Modal } from "@/components/ui/modal";
import { ActionForm, Field } from "@/components/ui/form";
import { requirePermission } from "@/server/auth/dal";
import { listarListas } from "@/server/data/queries";
import { guardarListaAction } from "@/server/actions/comercial";
import { entero, href, paginar, uno, type SearchParams } from "@/lib/urls";

export const metadata: Metadata = { title: "Listas de precios" };
const BASE = "/comercial/precios";

export default async function Precios({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission(202);
  const sp = await searchParams;
  const q = uno(sp, "q")?.slice(0, 80);
  const [todas, filas] = await Promise.all([listarListas(), listarListas(q)]);
  const p = paginar(filas, entero(sp, "pagina"));
  const editarId = entero(sp, "editar");
  const nueva = uno(sp, "nueva") === "1";
  const edita = editarId ? todas.find((l) => l.id === editarId) : undefined;

  return (
    <>
      <PageHead
        kicker="Comercial"
        title="Listas de precios"
        sub="Cada cliente cotiza con una lista. Una lista nueva nace con los precios de la lista base."
        actions={<Link className="btn btn-primary" href={href(BASE, { nueva: 1 })} scroll={false}>Nueva lista</Link>}
      />
      <OkNotice ok={uno(sp, "ok")} />
      <Filtros q={q} placeholder="N° o descripción…" />
      <div className="table-wrap">
        {p.filas.length === 0 ? (
          <Vacio>No hay listas que coincidan.</Vacio>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>N° lista</th><th>Descripción</th><th>Estado</th><th className="r"><span className="sr-only">Funciones</span></th></tr>
            </thead>
            <tbody>
              {p.filas.map((l) => (
                <tr key={l.id}>
                  <td className="strong">{l.id}</td>
                  <td>{l.descripcion}</td>
                  <td><ActivoChip activo={l.activo} /></td>
                  <td className="r">
                    <div className="row-actions">
                      <Link className="link-action" href={`${BASE}/${l.id}`}>Precios</Link>
                      <Link className="link-action" href={href(BASE, { editar: l.id, q })} scroll={false}>Editar</Link>
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
        <Modal title={edita ? "Editar lista de precios" : "Nueva lista de precios"} closeHref={href(BASE, { q })}>
          <ActionForm action={guardarListaAction} cancelHref={href(BASE, { q })}>
            <input type="hidden" name="id" value={edita?.id ?? ""} />
            <div className="form-grid">
              <Field name="descripcion" label="Descripción" required defaultValue={edita?.descripcion} maxLength={80} className="full" />
              {edita && <Field name="activo" label="Estado" as="select" defaultValue={edita.activo ? "1" : "0"} options={[{ value: "1", label: "Activa" }, { value: "0", label: "Desactivada" }]} />}
            </div>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
