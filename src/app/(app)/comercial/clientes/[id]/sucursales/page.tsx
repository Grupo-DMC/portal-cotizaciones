import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead, Vacio, ActivoChip, OkNotice } from "@/components/ui/server";
import { Modal } from "@/components/ui/modal";
import { ActionForm, Field } from "@/components/ui/form";
import { requirePermission } from "@/server/auth/dal";
import { clientePorId, sucursalesDeCliente } from "@/server/data/queries";
import { guardarSucursalAction } from "@/server/actions/comercial";
import { entero, href, uno, type SearchParams } from "@/lib/urls";
import { REGIONES } from "@/lib/permisos";

export const metadata: Metadata = { title: "Sucursales del cliente" };

export default async function Sucursales({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  await requirePermission(201);
  const { id } = await params;
  const clienteId = /^\d{1,9}$/.test(id) ? Number(id) : NaN;
  const cliente = Number.isFinite(clienteId) ? await clientePorId(clienteId) : null;
  if (!cliente) notFound();
  const sp = await searchParams;
  const base = `/comercial/clientes/${cliente.id}/sucursales`;
  const filas = await sucursalesDeCliente(cliente.id);
  const editarId = entero(sp, "editar");
  const nueva = uno(sp, "nueva") === "1";
  const edita = editarId ? filas.find((s) => s.id === editarId) : undefined;

  return (
    <>
      <PageHead
        kicker={`Comercial · ${cliente.razonSocial}`}
        title="Sucursales del cliente"
        sub={`${cliente.rut} · ${filas.length} ${filas.length === 1 ? "sucursal" : "sucursales"}`}
        actions={
          <>
            <Link className="btn" href="/comercial/clientes">Volver a clientes</Link>
            <Link className="btn btn-primary" href={href(base, { nueva: 1 })} scroll={false}>Nueva sucursal</Link>
          </>
        }
      />
      <OkNotice ok={uno(sp, "ok")} />
      <div className="table-wrap">
        {filas.length === 0 ? (
          <Vacio>Este cliente no tiene sucursales.</Vacio>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Nombre</th><th>Dirección</th><th>Encargado local</th><th>Contacto</th><th>Estado</th><th className="r"><span className="sr-only">Funciones</span></th></tr>
            </thead>
            <tbody>
              {filas.map((s) => (
                <tr key={s.id}>
                  <td className="strong">
                    {s.nombre}
                    {s.casaMatriz && <div className="sub">Casa matriz</div>}
                  </td>
                  <td>{s.direccion}<div className="sub">{s.comuna} · {s.region}</div></td>
                  <td>{s.encargado || <span className="muted">—</span>}</td>
                  <td>{s.telefonoEncargado || "—"}<div className="sub">{s.emailEncargado}</div></td>
                  <td><ActivoChip activo={s.activo} /></td>
                  <td className="r">
                    <div className="row-actions">
                      <Link className="link-action" href={href(base, { editar: s.id })} scroll={false}>Editar</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(edita || nueva) && (
        <Modal title={edita ? "Editar sucursal" : "Nueva sucursal"} closeHref={base} wide>
          <ActionForm action={guardarSucursalAction} cancelHref={base}>
            <input type="hidden" name="clienteId" value={cliente.id} />
            <input type="hidden" name="id" value={edita?.id ?? ""} />
            <div className="form-grid">
              <Field name="nombre" label="Nombre" required defaultValue={edita?.nombre} maxLength={80} className="full" />
              <Field name="direccion" label="Dirección" required defaultValue={edita?.direccion} maxLength={150} className="full" />
              <Field name="comuna" label="Comuna" required defaultValue={edita?.comuna} maxLength={60} />
              <Field name="region" label="Región" as="select" required vacio="Seleccione región" defaultValue={edita?.region} options={REGIONES} />
              <Field name="encargado" label="Encargado local" defaultValue={edita?.encargado} maxLength={80} />
              <Field name="telefonoEncargado" label="Teléfono encargado" defaultValue={edita?.telefonoEncargado} maxLength={30} inputMode="tel" />
              <Field name="emailEncargado" label="Email encargado" type="email" defaultValue={edita?.emailEncargado} maxLength={120} />
              <Field name="casaMatriz" label="Casa matriz" as="select" defaultValue={edita?.casaMatriz ? "1" : "0"} options={[{ value: "0", label: "No" }, { value: "1", label: "Sí" }]} />
              <Field name="activo" label="Estado" as="select" defaultValue={edita?.activo === false ? "0" : "1"} options={[{ value: "1", label: "Activo" }, { value: "0", label: "Desactivado" }]} />
            </div>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
