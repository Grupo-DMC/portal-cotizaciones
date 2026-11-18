import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead, Pager, Filtros, Vacio, OkNotice } from "@/components/ui/server";
import { Modal } from "@/components/ui/modal";
import { ActionForm, Field } from "@/components/ui/form";
import { requirePermission } from "@/server/auth/dal";
import { listaPorId, preciosDeLista, productoPorId, productosSinPrecio } from "@/server/data/queries";
import { guardarPrecioAction } from "@/server/actions/comercial";
import { entero, href, paginar, uno, type SearchParams } from "@/lib/urls";
import { formatCLP } from "@/lib/format";

export const metadata: Metadata = { title: "Precios de la lista" };

export default async function PreciosLista({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  await requirePermission(202);
  const { id } = await params;
  const lista = /^\d{1,9}$/.test(id) ? await listaPorId(Number(id)) : null;
  if (!lista) notFound();
  const sp = await searchParams;
  const base = `/comercial/precios/${lista.id}`;
  const q = uno(sp, "q")?.slice(0, 80);
  const filas = await preciosDeLista(lista.id, q);
  const p = paginar(filas, entero(sp, "pagina"));
  const editarId = entero(sp, "editar");
  const agregar = uno(sp, "agregar") === "1";
  const edita = editarId ? filas.find((x) => x.productoId === editarId) ?? (await preciosDeLista(lista.id)).find((x) => x.productoId === editarId) : undefined;
  const sinPrecio = agregar ? await productosSinPrecio(lista.id) : [];
  const prodEdita = edita ? await productoPorId(edita.productoId) : null;

  return (
    <>
      <PageHead
        kicker="Comercial · listas de precios"
        title={lista.descripcion}
        sub={`Lista N° ${lista.id} · ${filas.length} productos con precio`}
        actions={
          <>
            <Link className="btn" href="/comercial/precios">Volver a listas</Link>
            <Link className="btn btn-primary" href={href(base, { agregar: 1 })} scroll={false}>Agregar producto</Link>
          </>
        }
      />
      <OkNotice ok={uno(sp, "ok")} />
      <Filtros q={q} placeholder="Código o descripción…" />
      <div className="table-wrap">
        {p.filas.length === 0 ? (
          <Vacio>No hay productos con precio en esta lista.</Vacio>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Código</th><th>Descripción</th><th className="r">Precio lista</th><th className="r">Precio venta</th><th className="r"><span className="sr-only">Funciones</span></th></tr>
            </thead>
            <tbody>
              {p.filas.map((x) => (
                <tr key={x.productoId}>
                  <td className="strong">{x.codigo}</td>
                  <td>{x.descripcion}</td>
                  <td className="r">{formatCLP(x.precioLista)}</td>
                  <td className="r strong">{x.precioVenta === 0 ? <span style={{ color: "var(--color-accent-ink)" }}>Sin precio</span> : formatCLP(x.precioVenta)}</td>
                  <td className="r">
                    <div className="row-actions">
                      <Link className="link-action" href={href(base, { editar: x.productoId, q })} scroll={false}>Editar precio</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pager base={base} params={{ q }} actual={p.actual} paginas={p.paginas} total={p.total} tam={p.tam} />

      {edita && prodEdita && (
        <Modal title="Editar precio" closeHref={href(base, { q })}>
          <p style={{ margin: "0 0 16px" }}><strong>{prodEdita.codigo}</strong> — {prodEdita.descripcion}</p>
          <ActionForm action={guardarPrecioAction} cancelHref={href(base, { q })}>
            <input type="hidden" name="listaId" value={lista.id} />
            <input type="hidden" name="productoId" value={edita.productoId} />
            <div className="form-grid">
              <Field name="precioLista" label="Precio lista (neto)" type="number" required min={0} inputMode="numeric" defaultValue={edita.precioLista} />
              <Field name="precioVenta" label="Precio venta (neto)" type="number" required min={0} inputMode="numeric" defaultValue={edita.precioVenta} hint="Es el valor que se carga al cotizar." />
            </div>
          </ActionForm>
        </Modal>
      )}
      {agregar && (
        <Modal title="Agregar producto a la lista" closeHref={base}>
          {sinPrecio.length === 0 ? (
            <Vacio>Todos los productos activos ya tienen precio en esta lista.</Vacio>
          ) : (
            <ActionForm action={guardarPrecioAction} cancelHref={base} submitLabel="Agregar">
              <input type="hidden" name="listaId" value={lista.id} />
              <div className="form-grid">
                <Field name="productoId" label="Producto" as="select" required className="full" vacio="Seleccione un producto" options={sinPrecio.map((x) => ({ value: x.id, label: `${x.codigo} · ${x.descripcion}` }))} />
                <Field name="precioLista" label="Precio lista (neto)" type="number" required min={0} inputMode="numeric" />
                <Field name="precioVenta" label="Precio venta (neto)" type="number" required min={0} inputMode="numeric" />
              </div>
            </ActionForm>
          )}
        </Modal>
      )}
    </>
  );
}
