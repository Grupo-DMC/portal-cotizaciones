"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Combobox } from "@/components/ui/combobox";
import { guardarCotizacionAction } from "@/server/actions/documentos";
import { calcularLinea, calcularTotales, IVA_PCT } from "@/lib/calculo";
import { formatCLP, formatNum } from "@/lib/format";

export interface ClienteOpc {
  id: number; razonSocial: string; rut: string; direccion: string; email: string; region: string; telefono: string;
  listaPrecioId: number; listaNombre: string; sucursales: { id: number; nombre: string; direccion: string; casaMatriz: boolean }[];
}
export interface ProductoOpc { id: number; codigo: string; descripcion: string; stock: number }
export interface LineaInicial { productoId: number; descripcion: string; cantidad: number; valorNeto: number; descuento: number }
export interface Inicial { clienteId: number; sucursalId: number | null; proyecto: string; fecha: string; observaciones: string; lineas: LineaInicial[] }

interface Linea { key: number; productoId: number | null; descripcion: string; cantidad: string; valorNeto: string; descuento: string }

let contador = 1;
const nuevaLinea = (): Linea => ({ key: contador++, productoId: null, descripcion: "", cantidad: "1", valorNeto: "0", descuento: "0" });
const aNum = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function Guardar({ etiqueta }: { etiqueta: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} aria-busy={pending}>
      {pending ? "Guardando…" : etiqueta}
    </button>
  );
}

export function CotizacionEditor({
  modo, documentoId, folio, clientes, productos, precios, inicial,
}: {
  modo: "nueva" | "editar";
  documentoId?: number;
  folio: number;
  clientes: ClienteOpc[];
  productos: ProductoOpc[];
  precios: Record<number, Record<number, number>>;
  inicial?: Inicial;
}) {
  const [state, action] = useActionState(guardarCotizacionAction, undefined);
  const [clienteId, setClienteId] = useState<number | null>(inicial?.clienteId ?? null);
  const [sucursalId, setSucursalId] = useState<number | null>(inicial?.sucursalId ?? null);
  const [proyecto, setProyecto] = useState(inicial?.proyecto ?? "");
  const [fecha, setFecha] = useState(inicial?.fecha ?? new Date().toISOString().slice(0, 10));
  const [observaciones, setObservaciones] = useState(inicial?.observaciones ?? "");
  const [lineas, setLineas] = useState<Linea[]>(() =>
    inicial?.lineas.length
      ? inicial.lineas.map((l) => ({ key: contador++, productoId: l.productoId, descripcion: l.descripcion, cantidad: String(l.cantidad), valorNeto: String(l.valorNeto), descuento: String(l.descuento) }))
      : [nuevaLinea()],
  );
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cliente = clientes.find((c) => c.id === clienteId) ?? null;
  const stockDe = useMemo(() => new Map(productos.map((p) => [p.id, p.stock])), [productos]);
  const opcionesCliente = useMemo(() => clientes.map((c) => ({ value: c.id, label: c.razonSocial, sub: c.rut })), [clientes]);
  const opcionesProducto = useMemo(() => productos.map((p) => ({ value: p.id, label: p.codigo, sub: p.descripcion })), [productos]);

  const totales = calcularTotales(lineas.map((l) => ({ cantidad: aNum(l.cantidad), valorNeto: aNum(l.valorNeto), descuento: aNum(l.descuento) })));

  function elegirCliente(id: number | null) {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    setSucursalId(c ? (c.sucursales.find((s) => s.casaMatriz) ?? c.sucursales[0])?.id ?? null : null);
    setAviso(null);
    if (c) {
      // Los precios dependen de la lista del cliente: se recargan para las líneas ya elegidas.
      const lista = precios[c.listaPrecioId] ?? {};
      const hayProductos = lineas.some((l) => l.productoId);
      setLineas((ls) => ls.map((l) => (l.productoId ? { ...l, valorNeto: String(lista[l.productoId] ?? 0) } : l)));
      if (hayProductos) setAviso(`Los precios se actualizaron a la lista «${c.listaNombre}».`);
    }
  }

  function elegirProducto(key: number, productoId: number | null) {
    const p = productos.find((x) => x.id === productoId);
    const precio = cliente && productoId ? precios[cliente.listaPrecioId]?.[productoId] ?? 0 : 0;
    setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, productoId, descripcion: p?.descripcion ?? "", valorNeto: String(precio) } : l)));
  }

  const cambiar = (key: number, campo: keyof Linea, valor: string) => setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)));

  function validar(e: React.FormEvent<HTMLFormElement>) {
    if (!cliente) return bloquear(e, "Seleccione un cliente.");
    for (const [i, l] of lineas.entries()) {
      if (!l.productoId) return bloquear(e, `Seleccione un producto en la línea ${i + 1}.`);
      if (!(aNum(l.cantidad) >= 1) || !Number.isInteger(aNum(l.cantidad))) return bloquear(e, `Cantidad incorrecta en la línea ${i + 1} (entero, mínimo 1).`);
      if (!(aNum(l.valorNeto) > 0)) return bloquear(e, `El precio base de la línea ${i + 1} debe ser mayor a 0. Ajústelo aquí o en Listas de precios.`);
      const d = aNum(l.descuento);
      if (d < 0 || d > 100) return bloquear(e, `El descuento de la línea ${i + 1} debe estar entre 0 y 100.`);
    }
    setErrorLocal(null);
  }
  function bloquear(e: React.FormEvent, msg: string) {
    e.preventDefault();
    setErrorLocal(msg);
  }

  const payloadLineas = JSON.stringify(
    lineas.map((l) => ({ productoId: l.productoId ?? 0, descripcion: l.descripcion, cantidad: aNum(l.cantidad), valorNeto: aNum(l.valorNeto), descuento: aNum(l.descuento) })),
  );
  const error = errorLocal ?? state?.error;

  return (
    <form action={action} onSubmit={validar} noValidate>
      <input type="hidden" name="modo" value={modo} />
      <input type="hidden" name="documentoId" value={documentoId ?? ""} />
      <input type="hidden" name="clienteId" value={clienteId ?? ""} />
      <input type="hidden" name="sucursalId" value={sucursalId ?? ""} />
      <input type="hidden" name="lineas" value={payloadLineas} />

      {error && <div role="alert" className="form-error">{error}</div>}
      {aviso && <div className="notice warn" role="status">{aviso}</div>}

      <div className="doc-sheet">
        <div className="doc-head">
          <div className="doc-company">
            <p>GRUPO DMC</p>
            <p>Comercializadora DMC S.p.A.</p>
            <p>Madrid 1269, Santiago</p>
            <p>Teléfono: (56-2) 25555739</p>
            <p>Email: info@grupodmc.cl</p>
          </div>
          <div className="doc-folio">
            <div className="l">Cotización N°</div>
            <div className="v">{folio}</div>
          </div>
        </div>

        <div className="form-grid" style={{ marginTop: 20 }}>
          <div className="field">
            <label htmlFor="cliente">Cliente *</label>
            <Combobox id="cliente" options={opcionesCliente} value={clienteId} onChange={elegirCliente} placeholder="Buscar por nombre o RUT…" ariaLabel="Cliente" />
          </div>
          <div className="field">
            <label htmlFor="sucursal">Sucursal</label>
            <select id="sucursal" className="select" value={sucursalId ?? ""} onChange={(e) => setSucursalId(e.target.value ? Number(e.target.value) : null)} disabled={!cliente}>
              {!cliente && <option value="">Seleccione primero un cliente</option>}
              {cliente?.sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}{s.casaMatriz ? " (casa matriz)" : ""}</option>
              ))}
            </select>
          </div>
          <div className="field"><label htmlFor="rut">RUT</label><input id="rut" className="input" readOnly value={cliente?.rut ?? ""} /></div>
          <div className="field"><label htmlFor="rz">Razón social</label><input id="rz" className="input" readOnly value={cliente?.razonSocial ?? ""} /></div>
          <div className="field"><label htmlFor="dir">Dirección</label><input id="dir" className="input" readOnly value={cliente ? (cliente.sucursales.find((s) => s.id === sucursalId)?.direccion ?? cliente.direccion) : ""} /></div>
          <div className="field"><label htmlFor="em">Email</label><input id="em" className="input" readOnly value={cliente?.email ?? ""} /></div>
          <div className="field"><label htmlFor="tel">Teléfono comercial</label><input id="tel" className="input" readOnly value={cliente?.telefono ?? ""} /></div>
          <div className="field"><label htmlFor="lista">Lista de precios</label><input id="lista" className="input" readOnly value={cliente?.listaNombre ?? ""} /></div>
          <div className="field">
            <label htmlFor="proyecto">Proyecto</label>
            <input id="proyecto" name="proyecto" className="input" value={proyecto} onChange={(e) => setProyecto(e.target.value)} maxLength={150} placeholder="Nombre del proyecto" />
          </div>
          <div className="field">
            <label htmlFor="fecha">Fecha del documento</label>
            <input id="fecha" name="fecha" type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </div>
        </div>

        <h2 style={{ margin: "26px 0 10px" }}>Detalle del documento</h2>
        <div style={{ overflowX: "auto" }}>
          <table className="lines">
            <thead>
              <tr>
                <th style={{ width: 36 }}>N°</th>
                <th style={{ width: 210 }}>Producto</th>
                <th>Descripción</th>
                <th style={{ width: 90 }}>Cantidad</th>
                <th style={{ width: 130 }}>Precio base neto</th>
                <th style={{ width: 90 }}>Desc. %</th>
                <th style={{ width: 120 }} className="num">Precio unit. neto</th>
                <th style={{ width: 130 }} className="num">Total neto</th>
                <th style={{ width: 40 }}><span className="sr-only">Quitar</span></th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => {
                const calc = calcularLinea({ cantidad: aNum(l.cantidad), valorNeto: aNum(l.valorNeto), descuento: aNum(l.descuento) });
                const stock = l.productoId ? stockDe.get(l.productoId) ?? 0 : null;
                const restante = stock != null ? stock - aNum(l.cantidad) : null;
                return (
                  <tr key={l.key}>
                    <td style={{ paddingTop: 16 }}>{i + 1}</td>
                    <td>
                      <Combobox options={opcionesProducto} value={l.productoId} onChange={(v) => elegirProducto(l.key, v)} placeholder={cliente ? "Buscar producto…" : "Elija un cliente primero"} disabled={!cliente} ariaLabel={`Producto de la línea ${i + 1}`} />
                      {stock != null && (
                        <div className={`stock-tag${restante != null && restante < 0 ? " low" : ""}`}>
                          Stock disponible: {formatNum(stock)}
                          {restante != null && restante < 0 ? ` · faltan ${formatNum(-restante)}` : ""}
                        </div>
                      )}
                    </td>
                    <td><input className="input" aria-label={`Descripción de la línea ${i + 1}`} value={l.descripcion} maxLength={200} onChange={(e) => cambiar(l.key, "descripcion", e.target.value)} /></td>
                    <td><input className="input num" aria-label={`Cantidad de la línea ${i + 1}`} inputMode="numeric" value={l.cantidad} onChange={(e) => cambiar(l.key, "cantidad", e.target.value.replace(/[^\d]/g, ""))} /></td>
                    <td><input className="input num" aria-label={`Precio base de la línea ${i + 1}`} inputMode="numeric" value={l.valorNeto} onChange={(e) => cambiar(l.key, "valorNeto", e.target.value.replace(/[^\d]/g, ""))} /></td>
                    <td><input className="input num" aria-label={`Descuento de la línea ${i + 1}`} inputMode="decimal" value={l.descuento} onChange={(e) => cambiar(l.key, "descuento", e.target.value.replace(/[^\d.,]/g, ""))} /></td>
                    <td className="num" style={{ paddingTop: 16 }}>{formatCLP(calc.valorUnitario)}</td>
                    <td className="num" style={{ paddingTop: 16, fontWeight: 600 }}>{formatCLP(calc.totalLinea)}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-ghost" aria-label={`Quitar la línea ${i + 1}`} disabled={lineas.length === 1} onClick={() => setLineas((ls) => ls.filter((x) => x.key !== l.key))}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="button" className="btn btn-sm" onClick={() => setLineas((ls) => [...ls, nuevaLinea()])}>+ Agregar línea</button>
        </div>

        <div className="two-col" style={{ marginTop: 26, alignItems: "start" }}>
          <div className="field">
            <label htmlFor="obs">Observaciones</label>
            <textarea id="obs" name="observaciones" className="textarea" rows={6} maxLength={1000} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Condiciones comerciales, plazos, validez de la oferta…" />
          </div>
          <div className="totals" aria-live="polite">
            <div><span>Total neto</span><span>{formatCLP(totales.neto)}</span></div>
            <div><span>I.V.A. ({IVA_PCT}%)</span><span>{formatCLP(totales.iva)}</span></div>
            <div className="grand"><span>Total</span><span>{formatCLP(totales.total)}</span></div>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <Link href="/documentos" className="btn">Cancelar</Link>
        <Guardar etiqueta={modo === "editar" ? "Actualizar cotización" : "Guardar cotización"} />
      </div>
    </form>
  );
}
