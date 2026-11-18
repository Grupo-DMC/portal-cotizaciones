import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Pager, Filtros, Vacio, ActivoChip, OkNotice } from "@/components/ui/server";
import { Modal } from "@/components/ui/modal";
import { ClienteForm } from "@/components/cliente-form";
import { requirePermission } from "@/server/auth/dal";
import { clientePorId, ejecutivos, listarClientes, listarListas } from "@/server/data/queries";
import { alternarClienteAction } from "@/server/actions/comercial";
import { entero, href, paginar, uno, type SearchParams } from "@/lib/urls";

export const metadata: Metadata = { title: "Maestro de clientes" };
const BASE = "/comercial/clientes";

export default async function Clientes({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission(201);
  const sp = await searchParams;
  const q = uno(sp, "q")?.slice(0, 80);
  const filas = await listarClientes(q);
  const p = paginar(filas, entero(sp, "pagina"));
  const editarId = entero(sp, "editar");
  const nuevo = uno(sp, "nuevo") === "1";
  const edita = editarId ? await clientePorId(editarId) : null;
  const [ejs, listas] = edita || nuevo ? await Promise.all([ejecutivos(), listarListas()]) : [[], []];

  return (
    <>
      <PageHead
        kicker="Comercial"
        title="Maestro de clientes"
        sub="Clientes, sus sucursales y la lista de precios con la que se les cotiza."
        actions={
          <>
            <a className="btn" href={href("/api/export/clientes", { q })}>Exportar CSV</a>
            <Link className="btn btn-primary" href={href(BASE, { nuevo: 1, q })} scroll={false}>Nuevo cliente</Link>
          </>
        }
      />
      <OkNotice ok={uno(sp, "ok")} />
      <Filtros q={q} placeholder="RUT, razón social, comuna…" />

      <div className="table-wrap">
        {p.filas.length === 0 ? (
          <Vacio>No hay clientes que coincidan.</Vacio>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>RUT</th>
                <th>Razón social</th>
                <th>Dirección</th>
                <th>Contacto</th>
                <th>Lista de precios</th>
                <th>Estado</th>
                <th className="r"><span className="sr-only">Funciones</span></th>
              </tr>
            </thead>
            <tbody>
              {p.filas.map((c) => (
                <tr key={c.id}>
                  <td className="nowrap">{c.rut}</td>
                  <td className="strong">{c.razonSocial}</td>
                  <td>
                    {c.direccion}
                    <div className="sub">{c.comuna}</div>
                  </td>
                  <td>
                    {c.contacto || <span className="muted">—</span>}
                    <div className="sub">{c.email}</div>
                  </td>
                  <td>{c.lista}</td>
                  <td><ActivoChip activo={c.activo} /></td>
                  <td className="r">
                    <div className="row-actions">
                      <Link className="link-action" href={href(BASE, { editar: c.id, q })} scroll={false}>Editar</Link>
                      <Link className="link-action" href={`${BASE}/${c.id}/sucursales`}>Sucursales</Link>
                      <Link className="link-action" href={`${BASE}/${c.id}/precios`}>Precios</Link>
                      <form action={alternarClienteAction.bind(null, c.id)}>
                        <button className="link-action" type="submit">{c.activo ? "Desactivar" : "Activar"}</button>
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

      {(edita || nuevo) && (
        <Modal title={edita ? "Editar cliente" : "Nuevo cliente"} closeHref={href(BASE, { q })} wide>
          <ClienteForm cliente={edita ?? undefined} ejecutivos={ejs} listas={listas.filter((l) => l.activo || l.id === edita?.listaPrecioId)} cancelHref={href(BASE, { q })} />
        </Modal>
      )}
    </>
  );
}
