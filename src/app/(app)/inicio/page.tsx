import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, EstadoChip, Vacio } from "@/components/ui/server";
import { puede, requireUser } from "@/server/auth/dal";
import { resumenInicio } from "@/server/data/queries";
import { formatCLP, formatFecha, formatHora, MESES } from "@/lib/format";
import { uno, type SearchParams } from "@/lib/urls";

export const metadata: Metadata = { title: "Inicio" };

const COLOR_ESTADO: Record<string, string> = {
  P: "#b8b3b0", A: "#2e7d32", EP: "#c98a00", F: "#201e1d", DP: "#6d6865", DT: "#3f3b39", R: "#b3261e",
};

export default async function Inicio({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const verDocs = puede(user, 302);
  const r = await resumenInicio(verDocs);
  const primerNombre = user.nombre.split(" ")[0];
  const maxMes = Math.max(...r.meses.map((m) => m.monto), 1);
  const totalEmbudo = r.embudo.reduce((t, e) => t + e.cantidad, 0);

  return (
    <>
      <PageHead
        kicker="Panel general"
        title={`Hola, ${primerNombre}`}
        sub={`Resumen de ${MESES[r.mesActual - 1].toLowerCase()}: lo que se cotizó, lo que avanzó y lo que falta en bodega.`}
        actions={puede(user, 301) ? <Link className="btn btn-primary" href="/documentos/cotizacion">Nueva cotización</Link> : null}
      />

      {uno(sp, "denegado") && (
        <div className="notice err" role="alert">
          Su rol no tiene permiso para abrir esa página.
        </div>
      )}

      <div className="kpi-row">
        <Link className="kpi" href={verDocs ? "/documentos" : "/inicio"}>
          <div className="kpi-label">Documentos vigentes del mes</div>
          <div className="kpi-value">{r.vigentes}</div>
          <div className="kpi-note">Sin contar rechazados</div>
        </Link>
        <Link className="kpi" href={verDocs ? "/documentos" : "/inicio"}>
          <div className="kpi-label">Monto neto cotizado</div>
          <div className="kpi-value">{formatCLP(r.monto)}</div>
          <div className="kpi-note">Documentos vigentes del mes</div>
        </Link>
        <Link className="kpi" href={verDocs ? "/documentos" : "/inicio"}>
          <div className="kpi-label">Aprobados</div>
          <div className="kpi-value">{r.aprobados}</div>
          <div className="kpi-note">Aceptados, en proceso o facturados</div>
        </Link>
        <Link className="kpi" href={puede(user, 101) ? "/bodega/inventario" : "/inicio"}>
          <div className="kpi-label">Productos con stock crítico</div>
          <div className={`kpi-value${r.criticos.length ? " accent" : ""}`}>{r.criticos.length}</div>
          <div className="kpi-note">Cinco unidades o menos en total</div>
        </Link>
      </div>

      <div className="dash-grid">
        <div className="stack">
          {verDocs && (
            <section className="panel" aria-labelledby="h-recientes">
              <div className="panel-head">
                <h2 id="h-recientes">Documentos recientes</h2>
                <Link href="/documentos" className="link-action">Ver listado completo →</Link>
              </div>
              {r.recientes.length === 0 ? (
                <Vacio>No hay documentos este mes.</Vacio>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Folio</th>
                        <th>Fecha</th>
                        <th>Cliente y proyecto</th>
                        <th className="r">Neto</th>
                        <th>Estado</th>
                        <th className="r"><span className="sr-only">PDF</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.recientes.map((d) => (
                        <tr key={d.id}>
                          <td className="strong tnum">{d.folio}</td>
                          <td className="nowrap">{formatFecha(d.fecha)}</td>
                          <td>
                            <div className="strong">{d.razonSocial}</div>
                            <div className="sub">{d.proyecto}</div>
                          </td>
                          <td className="r">{formatCLP(d.neto)}</td>
                          <td><EstadoChip codigo={d.estado} /></td>
                          <td className="r">
                            <a className="link-action" href={`/api/documentos/${d.id}/pdf`} download>PDF</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <section className="panel" aria-labelledby="h-embudo">
            <div className="panel-head">
              <h2 id="h-embudo">Cotizaciones del mes por estado</h2>
              <span className="sub" style={{ fontSize: 13, color: "var(--color-ink-soft)" }}>{totalEmbudo} documentos</span>
            </div>
            <div className="panel-body">
              {totalEmbudo === 0 ? (
                <Vacio>Todavía no hay documentos este mes.</Vacio>
              ) : (
                <>
                  <div className="funnel" role="img" aria-label="Distribución de cotizaciones por estado">
                    {r.embudo.filter((e) => e.cantidad > 0).map((e) => (
                      <span key={e.codigo} style={{ width: `${(e.cantidad / totalEmbudo) * 100}%`, background: COLOR_ESTADO[e.codigo] }} title={`${e.nombre}: ${e.cantidad}`} />
                    ))}
                  </div>
                  <div className="funnel-legend">
                    {r.embudo.map((e) => (
                      <div key={e.codigo}>
                        <span><span className="swatch" style={{ background: COLOR_ESTADO[e.codigo] }} />{e.nombre}</span>
                        <b>{e.cantidad}</b>
                        <span style={{ color: "var(--color-ink-soft)" }}>{formatCLP(e.monto)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="panel" aria-labelledby="h-meses">
            <div className="panel-head">
              <h2 id="h-meses">Monto neto de los últimos 6 meses</h2>
              <span className="sub" style={{ fontSize: 13, color: "var(--color-ink-soft)" }}>Sin rechazados</span>
            </div>
            <div className="panel-body">
              <div className="bars" style={{ ["--n" as string]: r.meses.length }}>
                {r.meses.map((m, i) => (
                  <div key={m.clave} className={`bar${i === r.meses.length - 1 ? " now" : ""}`}>
                    <em>{m.monto >= 1_000_000 ? `${(m.monto / 1_000_000).toFixed(1).replace(".", ",")} M` : formatCLP(m.monto)}</em>
                    <i style={{ height: `${Math.max((m.monto / maxMes) * 100, 2)}%` }} />
                    <span>{m.etiqueta}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="panel" aria-labelledby="h-stock">
            <div className="panel-head">
              <h2 id="h-stock">Stock crítico</h2>
              <span style={{ fontSize: 13, color: "var(--color-accent-ink)", fontWeight: 600 }}>{r.criticos.length} productos</span>
            </div>
            {r.criticos.length === 0 ? (
              <Vacio>Ningún producto bajo el umbral.</Vacio>
            ) : (
              r.criticos.slice(0, 6).map((p) => (
                <div className="list-row" key={p.id}>
                  <div className="t">
                    <div>{p.codigo}</div>
                    <div>{p.descripcion}</div>
                  </div>
                  <b className="tnum" style={{ color: "var(--color-accent-ink)" }}>{p.saldo}</b>
                </div>
              ))
            )}
            {puede(user, 101) && (
              <div style={{ padding: "12px 18px", borderTop: "1px solid var(--color-line)" }}>
                <Link href="/bodega/inventario" className="link-action">Ir al inventario →</Link>
              </div>
            )}
          </section>

          <section className="panel" aria-labelledby="h-act">
            <div className="panel-head">
              <h2 id="h-act">Actividad reciente</h2>
            </div>
            {r.actividad.length === 0 ? (
              <Vacio>Todavía no hay actividad registrada.</Vacio>
            ) : (
              r.actividad.map((a) => (
                <div className="list-row" key={a.id}>
                  <div className="t"><div style={{ fontWeight: 400 }}>{a.texto}</div></div>
                  <span className="tnum" style={{ color: "var(--color-ink-soft)", fontSize: 13 }}>{formatHora(a.fecha)}</span>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </>
  );
}
