import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Pager, Filtros, Vacio, ActivoChip, OkNotice } from "@/components/ui/server";
import { Modal } from "@/components/ui/modal";
import { ActionForm, Field } from "@/components/ui/form";
import { requirePermission } from "@/server/auth/dal";
import { listarRoles, listarUsuarios } from "@/server/data/queries";
import { alternarUsuarioAction, guardarUsuarioAction } from "@/server/actions/admin";
import { entero, href, paginar, uno, type SearchParams } from "@/lib/urls";

export const metadata: Metadata = { title: "Usuarios" };
const BASE = "/admin/usuarios";

export default async function Usuarios({ searchParams }: { searchParams: SearchParams }) {
  const actor = await requirePermission(401);
  const sp = await searchParams;
  const q = uno(sp, "q")?.slice(0, 80);
  const [todos, filas, roles] = await Promise.all([listarUsuarios(), listarUsuarios(q), listarRoles()]);
  const p = paginar(filas, entero(sp, "pagina"));
  const editarId = entero(sp, "editar");
  const nuevo = uno(sp, "nuevo") === "1";
  const edita = editarId ? todos.find((u) => u.id === editarId) : undefined;

  return (
    <>
      <PageHead
        kicker="Administración"
        title="Usuarios"
        sub="Las contraseñas se guardan cifradas y nunca se muestran."
        actions={<Link className="btn btn-primary" href={href(BASE, { nuevo: 1 })} scroll={false}>Nuevo usuario</Link>}
      />
      <OkNotice ok={uno(sp, "ok")} />
      <Filtros q={q} placeholder="Nombre, correo o rol…" />
      <div className="table-wrap">
        {p.filas.length === 0 ? (
          <Vacio>No hay usuarios que coincidan.</Vacio>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th className="r"><span className="sr-only">Funciones</span></th></tr>
            </thead>
            <tbody>
              {p.filas.map((u) => (
                <tr key={u.id}>
                  <td className="strong">{u.nombre} {u.apPaterno} {u.apMaterno}</td>
                  <td>{u.correo}</td>
                  <td>{u.rol}</td>
                  <td><ActivoChip activo={u.activo} /></td>
                  <td className="r">
                    <div className="row-actions">
                      <Link className="link-action" href={href(BASE, { editar: u.id, q })} scroll={false}>Editar</Link>
                      {u.id !== actor.id && (
                        <form action={alternarUsuarioAction.bind(null, u.id)}>
                          <button className="link-action" type="submit">{u.activo ? "Desactivar" : "Activar"}</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pager base={BASE} params={{ q }} actual={p.actual} paginas={p.paginas} total={p.total} tam={p.tam} />

      {(edita || nuevo) && (
        <Modal title={edita ? "Editar usuario" : "Nuevo usuario"} closeHref={href(BASE, { q })}>
          <ActionForm action={guardarUsuarioAction} cancelHref={href(BASE, { q })}>
            <input type="hidden" name="id" value={edita?.id ?? ""} />
            <div className="form-grid">
              <Field name="nombre" label="Nombre" required defaultValue={edita?.nombre} maxLength={60} autoComplete="off" />
              <Field name="apPaterno" label="Apellido paterno" required defaultValue={edita?.apPaterno} maxLength={60} autoComplete="off" />
              <Field name="apMaterno" label="Apellido materno" defaultValue={edita?.apMaterno} maxLength={60} autoComplete="off" />
              <Field name="correo" label="Correo" type="email" required defaultValue={edita?.correo} maxLength={120} autoComplete="off" />
              <Field name="rolId" label="Rol" as="select" required defaultValue={edita?.rolId} options={roles.filter((r) => r.activo || r.id === edita?.rolId).map((r) => ({ value: r.id, label: r.nombre }))} />
              <Field name="activo" label="Estado" as="select" defaultValue={edita?.activo === false ? "0" : "1"} options={[{ value: "1", label: "Activo" }, { value: "0", label: "Desactivado" }]} />
              <Field
                name="clave" label={edita ? "Nueva contraseña" : "Contraseña"} type="password" required={!edita} className="full" autoComplete="new-password" maxLength={100}
                hint={edita ? "Déjela en blanco para conservar la actual." : "Mínimo 10 caracteres con mayúscula, minúscula y número."}
              />
            </div>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
