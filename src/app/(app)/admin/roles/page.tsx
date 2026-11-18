import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Vacio, ActivoChip, OkNotice } from "@/components/ui/server";
import { Modal } from "@/components/ui/modal";
import { ActionForm, Check, Field } from "@/components/ui/form";
import { requirePermission } from "@/server/auth/dal";
import { listarRoles } from "@/server/data/queries";
import { guardarRolAction } from "@/server/actions/admin";
import { ESTADOS } from "@/server/data/types";
import { GRUPOS, PAGINAS } from "@/lib/permisos";
import { entero, href, uno, type SearchParams } from "@/lib/urls";

export const metadata: Metadata = { title: "Roles y permisos" };
const BASE = "/admin/roles";

export default async function Roles({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission(402);
  const sp = await searchParams;
  const roles = await listarRoles();
  const editarId = entero(sp, "editar");
  const nuevo = uno(sp, "nuevo") === "1";
  const edita = editarId ? roles.find((r) => r.id === editarId) : undefined;
  const etiquetaPagina = new Map(PAGINAS.map((p) => [p.codigo, p.label]));

  return (
    <>
      <PageHead
        kicker="Administración"
        title="Roles y permisos"
        sub="Cada rol define qué páginas puede abrir y qué estados de documento puede asignar. El servidor valida estos permisos en cada página y acción."
        actions={<Link className="btn btn-primary" href={href(BASE, { nuevo: 1 })} scroll={false}>Nuevo rol</Link>}
      />
      <OkNotice ok={uno(sp, "ok")} />
      <div className="table-wrap">
        {roles.length === 0 ? (
          <Vacio>No hay roles.</Vacio>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Rol</th><th>Páginas permitidas</th><th>Estados que puede asignar</th><th>Estado</th><th className="r"><span className="sr-only">Funciones</span></th></tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td className="strong">{r.nombre}</td>
                  <td style={{ maxWidth: 420 }}>
                    {r.paginas.length === 0 ? <span className="muted">Ninguna</span> : r.paginas.map((c) => etiquetaPagina.get(c) ?? c).join(" · ")}
                  </td>
                  <td>{r.estados.length ? r.estados.map((c) => ESTADOS.find((e) => e.codigo === c)?.nombre).join(", ") : <span className="muted">Ninguno</span>}</td>
                  <td><ActivoChip activo={r.activo} /></td>
                  <td className="r">
                    <div className="row-actions">
                      <Link className="link-action" href={href(BASE, { editar: r.id })} scroll={false}>Editar</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(edita || nuevo) && (
        <Modal title={edita ? `Editar rol · ${edita.nombre}` : "Nuevo rol"} closeHref={BASE} wide>
          <ActionForm action={guardarRolAction} cancelHref={BASE}>
            <input type="hidden" name="id" value={edita?.id ?? ""} />
            <div className="form-grid">
              <Field name="nombre" label="Nombre del rol" required defaultValue={edita?.nombre} maxLength={60} />
              <Field name="activo" label="Estado" as="select" defaultValue={edita?.activo === false ? "0" : "1"} options={[{ value: "1", label: "Activo" }, { value: "0", label: "Desactivado" }]} />
            </div>
            <fieldset style={{ border: 0, padding: 0, margin: "22px 0 0" }}>
              <legend className="label" style={{ marginBottom: 10 }}>Páginas permitidas</legend>
              <div className="two-col" style={{ gap: "16px 28px" }}>
                {GRUPOS.map((g) => (
                  <div key={g}>
                    <div style={{ fontSize: 12.5, color: "var(--color-ink-soft)", fontWeight: 600, marginBottom: 6 }}>{g}</div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {PAGINAS.filter((p) => p.grupo === g).map((p) => (
                        <Check key={p.codigo} name="paginas" value={String(p.codigo)} label={p.label} defaultChecked={edita?.paginas.includes(p.codigo)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
            <fieldset style={{ border: 0, padding: 0, margin: "22px 0 0" }}>
              <legend className="label" style={{ marginBottom: 10 }}>Estados de documento que puede asignar</legend>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 22px" }}>
                {ESTADOS.map((e) => (
                  <Check key={e.codigo} name="estados" value={e.codigo} label={e.nombre} defaultChecked={edita?.estados.includes(e.codigo)} />
                ))}
              </div>
            </fieldset>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
