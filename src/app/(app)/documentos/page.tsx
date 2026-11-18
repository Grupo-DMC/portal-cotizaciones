import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Pager, Vacio, EstadoChip } from "@/components/ui/server";
import { Modal } from "@/components/ui/modal";
import { ActionForm, Field } from "@/components/ui/form";
import { ConfirmForm } from "@/components/ui/confirm";
import { puede, requirePermission } from "@/server/auth/dal";
import { documentoPorId, ejecutivoDeDocumento, listarDocumentos, opcionesFiltroDocs } from "@/server/data/queries";
import { cambiarEstadoAction, eliminarDocumentoAction } from "@/server/actions/documentos";
import { ESTADOS, TIPOS_DOCUMENTO } from "@/server/data/types";
import { entero, href, paginar, uno, type SearchParams } from "@/lib/urls";
import { formatCLP, formatFecha, MESES } from "@/lib/format";

export const metadata: Metadata = { title: "Listado de documentos" };
const BASE = "/documentos";

const MENSAJES: Record<string, string> = {
  estado: "El estado se actualizó.",
  eliminado: "El documento se eliminó.",
  "no-existe": "El documento no existe o fue eliminado.",
  "no-editable": "Un documento facturado o despachado no se puede editar. Use «Clonar» para crear uno nuevo.",
  "cot-creada": "Cotización guardada.",
  "cot-actualizada": "Cotización actualizada.",
};

export default async function Documentos({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission(302);
  const sp = await searchParams;
  const q = uno(sp, "q")?.slice(0, 80);
  const anio = entero(sp, "anio");
  const mes = entero(sp, "mes");
  const clienteId = entero(sp, "cliente");
  const tipo = uno(sp, "tipo");
  const sercue = TIPOS_DOCUMENTO.some((t) => t.sercue === tipo) ? tipo : undefined;
  const filtros = { q, anio, mes: mes && mes >= 1 && mes <= 12 ? mes : undefined, clienteId, sercue };

  const [filas, opciones] = await Promise.all([listarDocumentos(filtros), opcionesFiltroDocs()]);
  const p = paginar(filas, entero(sp, "pagina"));
  const params = { q, anio, mes: filtros.mes, cliente: clienteId, tipo: sercue };

  const verId = entero(sp, "ver");
  const estadoId = entero(sp, "estado");
  const verDoc = verId ? await documentoPorId(verId) : null;
  const estadoDoc = estadoId ? await documentoPorId(estadoId) : null;
  const ejecutivoVer = verDoc ? await ejecutivoDeDocumento(verDoc) : "";

  const ok = uno(sp, "ok");
  const folioOk = entero(sp, "folio");
  const pdfId = entero(sp, "pdf");
  const puedeEmitir = puede(user, 301);
  const estadosPermitidos = ESTADOS.filter((e) => user.rol.estados.includes(e.codigo));

  return (
    <>
      <PageHead
        kicker="Documentos"
        title="Listado de documentos"
        sub="Cotizaciones emitidas. Cambie su estado, edítelas, clónelas o descárguelas en PDF."
        actions={puedeEmitir ? <Link className="btn btn-primary" href="/documentos/cotizacion">Nueva cotización</Link> : null}
      />

      {ok && MENSAJES[ok] && (
        <div className={`notice${ok === "no-existe" || ok === "no-editable" ? " warn" : ""}`} role="status">
          <span>{MENSAJES[ok]}{folioOk && (ok === "cot-creada" || ok === "cot-actualizada") ? ` Folio N° ${folioOk}.` : ""}</span>
          {pdfId && (ok === "cot-creada" || ok === "cot-actualizada") && (
            <a className="link-action" href={`/api/documentos/${pdfId}/pdf`} download>Descargar PDF</a>
          )}
        </div>
      )}

      <form method="get" className="filters" role="search">
        <div className="field">
          <label htmlFor="anio">Año</label>
          <select id="anio" name="anio" className="select" defaultValue={anio ?? ""}>
            <option value="">Todos</option>
            {opciones.anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="mes">Mes</label>
          <select id="mes" name="mes" className="select" defaultValue={filtros.mes ?? ""}>
            <option value="">Todos</option>
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cliente">Cliente</label>
          <select id="cliente" name="cliente" className="select" defaultValue={clienteId ?? ""}>
            <option value="">Todos</option>
            {opciones.clientes.map((c) => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tipo">Tipo de documento</label>
          <select id="tipo" name="tipo" className="select" defaultValue={sercue ?? ""}>
            <option value="">Todos</option>
            {TIPOS_DOCUMENTO.map((t) => <option key={t.sercue} value={t.sercue}>{t.nombre}</option>)}
          </select>
        </div>
        <div className="field grow">
          <label htmlFor="q">Buscar</label>
          <input id="q" name="q" type="search" className="input" defaultValue={q ?? ""} placeholder="Folio, cliente, proyecto…" maxLength={80} autoComplete="off" />
        </div>
        <button type="submit" className="btn">Filtrar</button>
      </form>

      <div className="table-wrap">
        {p.filas.length === 0 ? (
          <Vacio>No hay documentos para este filtro.</Vacio>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha</th>
                <th>Razón social</th>
                <th>Proyecto</th>
                <th className="r">Total neto</th>
                <th>Estado</th>
                <th>Ejecutivo</th>
                <th className="r"><span className="sr-only">Funciones</span></th>
              </tr>
            </thead>
            <tbody>
              {p.filas.map((d) => (
                <tr key={d.id}>
                  <td className="strong tnum">{d.folio}</td>
                  <td className="nowrap">{formatFecha(d.fecha)}</td>
                  <td className="strong">{d.razonSocial}</td>
                  <td>{d.proyecto || <span className="muted">—</span>}</td>
                  <td className="r">{formatCLP(d.neto)}</td>
                  <td><EstadoChip codigo={d.estado} /></td>
                  <td>{d.ejecutivo}</td>
                  <td className="r">
                    <div className="row-actions">
                      <Link className="link-action" href={href(BASE, { ...params, ver: d.id })} scroll={false}>Ver</Link>
                      <a className="link-action" href={`/api/documentos/${d.id}/pdf`} download>PDF</a>
                      {puedeEmitir && !["F", "DP", "DT"].includes(d.estado) && <Link className="link-action" href={href("/documentos/cotizacion", { editar: d.id })}>Editar</Link>}
                      {puedeEmitir && <Link className="link-action" href={href("/documentos/cotizacion", { clonar: d.id })}>Clonar</Link>}
                      {estadosPermitidos.length > 0 && <Link className="link-action" href={href(BASE, { ...params, estado: d.id })} scroll={false}>Estado</Link>}
                      <ConfirmForm action={eliminarDocumentoAction.bind(null, d.id)} mensaje={`¿Eliminar la cotización ${d.folio}? Dejará de aparecer en el listado.`}>Eliminar</ConfirmForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pager base={BASE} params={params} actual={p.actual} paginas={p.paginas} total={p.total} tam={p.tam} />

      {verDoc && (
        <Modal title={`Cotización N° ${verDoc.folio}`} closeHref={href(BASE, params)} wide>
          <dl className="kv" style={{ marginBottom: 20 }}>
            <dt>Cliente</dt><dd>{verDoc.razonSocial}</dd>
            <dt>RUT</dt><dd>{verDoc.rut}</dd>
            <dt>Dirección</dt><dd>{verDoc.direccion}</dd>
            <dt>Proyecto</dt><dd>{verDoc.proyecto || "—"}</dd>
            <dt>Fecha</dt><dd>{formatFecha(verDoc.fecha)}</dd>
            <dt>Ejecutivo</dt><dd>{ejecutivoVer}</dd>
            <dt>Estado</dt><dd><EstadoChip codigo={verDoc.estado} /></dd>
          </dl>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>#</th><th>Código</th><th>Descripción</th><th className="r">Cant.</th><th className="r">Precio neto</th><th className="r">Desc. %</th><th className="r">Total neto</th></tr>
              </thead>
              <tbody>
                {verDoc.lineas.map((l) => (
                  <tr key={l.linea}>
                    <td>{l.linea}</td>
                    <td className="strong">{l.codigo}</td>
                    <td>{l.descripcion}</td>
                    <td className="r">{l.cantidad}</td>
                    <td className="r">{formatCLP(l.valorNeto)}</td>
                    <td className="r">{l.descuento}</td>
                    <td className="r">{formatCLP(l.totalLinea)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="two-col" style={{ marginTop: 18, alignItems: "start" }}>
            <div>
              <h3 style={{ marginBottom: 6 }}>Observaciones</h3>
              <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--color-ink-soft)" }}>{verDoc.observaciones || "Sin observaciones."}</p>
            </div>
            <div className="totals">
              <div><span>Total neto</span><span>{formatCLP(verDoc.neto)}</span></div>
              <div><span>I.V.A. (19%)</span><span>{formatCLP(verDoc.iva)}</span></div>
              <div className="grand"><span>Total</span><span>{formatCLP(verDoc.total)}</span></div>
            </div>
          </div>
          <div className="form-actions">
            <a className="btn btn-primary" href={`/api/documentos/${verDoc.id}/pdf`} download>Descargar PDF</a>
          </div>
        </Modal>
      )}

      {estadoDoc && estadosPermitidos.length > 0 && (
        <Modal title={`Actualizar estado · folio ${estadoDoc.folio}`} closeHref={href(BASE, params)}>
          <ActionForm action={cambiarEstadoAction} cancelHref={href(BASE, params)} submitLabel="Actualizar estado">
            <input type="hidden" name="id" value={estadoDoc.id} />
            <Field name="estado" label="Nuevo estado" as="select" required defaultValue={estadosPermitidos.some((e) => e.codigo === estadoDoc.estado) ? estadoDoc.estado : ""} vacio="Seleccione un estado" options={estadosPermitidos.map((e) => ({ value: e.codigo, label: e.nombre }))} hint="Solo ve los estados que su rol puede asignar." />
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
