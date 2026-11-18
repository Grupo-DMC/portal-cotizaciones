import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Pager, Filtros, Vacio, ActivoChip, OkNotice } from "@/components/ui/server";
import { Modal } from "@/components/ui/modal";
import { ActionForm, Field } from "@/components/ui/form";
import { requirePermission } from "@/server/auth/dal";
import { listarFamilias, listarSubfamilias } from "@/server/data/queries";
import { alternarSubfamiliaAction, guardarSubfamiliaAction } from "@/server/actions/bodega";
import { entero, href, paginar, uno, type SearchParams } from "@/lib/urls";

export const metadata: Metadata = { title: "Subfamilias" };
const BASE = "/bodega/subfamilias";

export default async function Subfamilias({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission(107);
  const sp = await searchParams;
  const q = uno(sp, "q")?.slice(0, 80);
  const [todas, filas, familias] = await Promise.all([listarSubfamilias(), listarSubfamilias(q), listarFamilias()]);
  const p = paginar(filas, entero(sp, "pagina"));
  const editarId = entero(sp, "editar");
  const nueva = uno(sp, "nueva") === "1";
  const edita = editarId ? todas.find((x) => x.id === editarId) : undefined;
  const opcionesFamilia = familias.filter((f) => f.activo || f.id === edita?.familiaId).map((f) => ({ value: f.id, label: `${f.codigo} · ${f.descripcion}` }));

  return (
    <>
      <PageHead
        kicker="Bodega · clasificación"
        title="Subfamilias"
        sub="Segundo nivel de clasificación, dentro de cada familia."
        actions={<Link className="btn btn-primary" href={href(BASE, { nueva: 1 })} scroll={false}>Nueva subfamilia</Link>}
      />
      <OkNotice ok={uno(sp, "ok")} />
      <Filtros q={q} placeholder="Código, descripción o familia…" />
      <div className="table-wrap">
        {p.filas.length === 0 ? (
          <Vacio>No hay subfamilias que coincidan.</Vacio>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Código</th><th>Descripción</th><th>Familia</th><th>Estado</th><th className="r"><span className="sr-only">Funciones</span></th></tr>
            </thead>
            <tbody>
              {p.filas.map((x) => (
                <tr key={x.id}>
                  <td className="strong">{x.codigo}</td>
                  <td>{x.descripcion}</td>
                  <td>{x.familia}</td>
                  <td><ActivoChip activo={x.activo} /></td>
                  <td className="r">
                    <div className="row-actions">
                      <Link className="link-action" href={href(BASE, { editar: x.id, q })} scroll={false}>Editar</Link>
                      <form action={alternarSubfamiliaAction.bind(null, x.id)}>
                        <button className="link-action" type="submit">{x.activo ? "Desactivar" : "Activar"}</button>
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
        <Modal title={edita ? "Editar subfamilia" : "Nueva subfamilia"} closeHref={href(BASE, { q })}>
          <ActionForm action={guardarSubfamiliaAction} cancelHref={href(BASE, { q })}>
            <input type="hidden" name="id" value={edita?.id ?? ""} />
            <div className="form-grid">
              <Field name="familiaId" label="Familia" as="select" required options={opcionesFamilia} defaultValue={edita?.familiaId} className="full" />
              <Field name="codigo" label="Código" required defaultValue={edita?.codigo} maxLength={10} />
              <Field name="descripcion" label="Descripción" required defaultValue={edita?.descripcion} maxLength={80} />
            </div>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
