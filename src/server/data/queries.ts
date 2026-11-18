import "server-only";
import { coincide, getStore, nombreCompleto } from "./store";
import { STOCK_CRITICO, nombreEstado, type Documento, type EstadoCodigo } from "./types";

const s = () => getStore();

/* ----------------------------------------------------------- Usuarios y roles */
export async function usuarioPorCorreo(correo: string) {
  const c = correo.trim().toLowerCase();
  return s().usuarios.find((u) => u.correo.toLowerCase() === c) ?? null;
}
export async function usuarioPorId(id: number) {
  return s().usuarios.find((u) => u.id === id) ?? null;
}
export async function rolPorId(id: number) {
  return s().roles.find((r) => r.id === id) ?? null;
}
export async function listarRoles(q?: string) {
  return s().roles.filter((r) => coincide(q, r.nombre));
}
export async function listarUsuarios(q?: string) {
  return s()
    .usuarios.map((u) => ({
      id: u.id, nombre: u.nombre, apPaterno: u.apPaterno, apMaterno: u.apMaterno, correo: u.correo,
      rolId: u.rolId, rol: s().roles.find((r) => r.id === u.rolId)?.nombre ?? "—", activo: u.activo,
    }))
    .filter((u) => coincide(q, u.nombre, u.apPaterno, u.apMaterno, u.correo, u.rol));
}

/* ----------------------------------------------------------------- Clientes */
export async function listarClientes(q?: string) {
  return s()
    .clientes.filter((c) => coincide(q, c.rut, c.razonSocial, c.comuna, c.email, c.contacto))
    .map((c) => ({ ...c, lista: s().listas.find((l) => l.id === c.listaPrecioId)?.descripcion ?? "—" }))
    .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
}
export async function clientePorId(id: number) {
  return s().clientes.find((c) => c.id === id) ?? null;
}
export async function ejecutivos() {
  return s().usuarios.filter((u) => u.activo).map((u) => ({ id: u.id, nombre: nombreCompleto(u) }));
}
export async function sucursalesDeCliente(clienteId: number) {
  return s().sucursales.filter((x) => x.clienteId === clienteId);
}
export async function sucursalPorId(id: number) {
  return s().sucursales.find((x) => x.id === id) ?? null;
}

/* ------------------------------------------------------------------- Precios */
export async function listarListas(q?: string) {
  return s().listas.filter((l) => coincide(q, l.id, l.descripcion));
}
export async function listaPorId(id: number) {
  return s().listas.find((l) => l.id === id) ?? null;
}
export async function preciosDeLista(listaId: number, q?: string) {
  return s()
    .precios.filter((p) => p.listaId === listaId)
    .map((p) => {
      const prod = s().productos.find((x) => x.id === p.productoId)!;
      return { ...p, codigo: prod.codigo, descripcion: prod.descripcion };
    })
    .filter((p) => coincide(q, p.codigo, p.descripcion))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}
export async function productosSinPrecio(listaId: number) {
  const con = new Set(s().precios.filter((p) => p.listaId === listaId).map((p) => p.productoId));
  return s().productos.filter((p) => p.activo && !con.has(p.id));
}
/** Mapa listaId → productoId → precio de venta (para el cotizador). */
export async function mapaPrecios() {
  const m: Record<number, Record<number, number>> = {};
  for (const p of s().precios) (m[p.listaId] ??= {})[p.productoId] = p.precioVenta;
  return m;
}

/* ------------------------------------------------------------------ Catálogo */
export async function listarFamilias(q?: string) {
  return s().familias.filter((f) => coincide(q, f.codigo, f.descripcion));
}
export async function listarSubfamilias(q?: string) {
  return s()
    .subfamilias.map((x) => ({ ...x, familia: s().familias.find((f) => f.id === x.familiaId)?.descripcion ?? "—" }))
    .filter((x) => coincide(q, x.codigo, x.descripcion, x.familia));
}
export async function listarProductos(q?: string, familiaId?: number) {
  return s()
    .productos.filter((p) => (familiaId ? p.familiaId === familiaId : true))
    .map((p) => ({
      ...p,
      familia: s().familias.find((f) => f.id === p.familiaId)?.descripcion ?? "—",
      codigoFamilia: s().familias.find((f) => f.id === p.familiaId)?.codigo ?? "",
      subfamilia: s().subfamilias.find((x) => x.id === p.subfamiliaId)?.codigo ?? "—",
    }))
    .filter((p) => coincide(q, p.codigo, p.descripcion, p.familia, p.subfamilia))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}
export async function productoPorId(id: number) {
  return s().productos.find((p) => p.id === id) ?? null;
}
export async function productosActivos() {
  return s().productos.filter((p) => p.activo).sort((a, b) => a.codigo.localeCompare(b.codigo));
}

/* ------------------------------------------------------------------- Bodegas */
export async function listarBodegas(q?: string) {
  return s().bodegas.filter((b) => coincide(q, b.codigo, b.nombre));
}
export function saldoTotal(productoId: number) {
  return s().saldos.filter((x) => x.productoId === productoId).reduce((t, x) => t + x.entradas - x.salidas, 0);
}
export async function saldoPorBodega(productoId: number) {
  return s()
    .bodegas.map((b) => {
      const x = s().saldos.find((y) => y.productoId === productoId && y.bodegaId === b.id);
      return { bodega: b, entradas: x?.entradas ?? 0, salidas: x?.salidas ?? 0, saldo: (x?.entradas ?? 0) - (x?.salidas ?? 0) };
    })
    .filter((x) => x.entradas || x.salidas);
}
export async function inventario(q?: string, familiaId?: number) {
  return (await listarProductos(q, familiaId)).map((p) => ({ ...p, total: saldoTotal(p.id) }));
}
export async function saldosGenerales(q?: string) {
  return (await listarProductos(q)).map((p) => {
    const xs = s().saldos.filter((x) => x.productoId === p.id);
    const entradas = xs.reduce((t, x) => t + x.entradas, 0);
    const salidas = xs.reduce((t, x) => t + x.salidas, 0);
    return { ...p, entradas, salidas, total: entradas - salidas };
  });
}
export async function movimientosFiltrados(productoId?: number, bodegaId?: number) {
  return s()
    .movimientos.filter((m) => (productoId ? m.productoId === productoId : true) && (bodegaId ? m.bodegaId === bodegaId : true))
    .map((m) => ({
      ...m,
      codigo: s().productos.find((p) => p.id === m.productoId)?.codigo ?? "—",
      bodega: s().bodegas.find((b) => b.id === m.bodegaId)?.nombre ?? "—",
      usuario: (() => {
        const u = s().usuarios.find((x) => x.id === m.usuarioId);
        return u ? nombreCompleto(u) : "—";
      })(),
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
}

/* --------------------------------------------------------------- Documentos */
export interface FiltroDocs { anio?: number; mes?: number; clienteId?: number; sercue?: string; q?: string; ejecutivoId?: number }

export async function listarDocumentos(f: FiltroDocs = {}) {
  return s()
    .documentos.filter((d) => !d.eliminado)
    .filter((d) => (f.anio ? Number(d.fechaInsert.slice(0, 4)) === f.anio : true))
    .filter((d) => (f.mes ? Number(d.fechaInsert.slice(5, 7)) === f.mes : true))
    .filter((d) => (f.clienteId ? d.clienteId === f.clienteId : true))
    .filter((d) => (f.sercue ? d.sercue === f.sercue : true))
    .filter((d) => (f.ejecutivoId ? d.usuarioId === f.ejecutivoId : true))
    .map((d) => ({
      ...d,
      estadoNombre: nombreEstado(d.estado),
      ejecutivo: (() => {
        const u = s().usuarios.find((x) => x.id === d.usuarioId);
        return u ? nombreCompleto(u) : "—";
      })(),
    }))
    .filter((d) => coincide(f.q, d.folio, d.razonSocial, d.proyecto, d.estadoNombre, d.ejecutivo, d.fecha))
    .sort((a, b) => b.folio - a.folio);
}
export async function documentoPorId(id: number): Promise<Documento | null> {
  return s().documentos.find((d) => d.id === id && !d.eliminado) ?? null;
}
export async function opcionesFiltroDocs() {
  const docs = s().documentos.filter((d) => !d.eliminado);
  const anios = [...new Set(docs.map((d) => Number(d.fechaInsert.slice(0, 4))))].sort((a, b) => b - a);
  const clientes = [...new Map(docs.map((d) => [d.clienteId, d.razonSocial])).entries()]
    .map(([id, razonSocial]) => ({ id, razonSocial }))
    .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
  return { anios, clientes };
}
export async function ejecutivoDeDocumento(d: Documento) {
  const u = s().usuarios.find((x) => x.id === d.usuarioId);
  return u ? nombreCompleto(u) : "—";
}
export async function folioSiguiente() {
  return s().seq.folio + 1;
}

/* ---------------------------------------------------------------- Dashboard */
export async function resumenInicio(incluirDocumentos: boolean) {
  const st = s();
  const ahora = new Date();
  const mes = ahora.getMonth() + 1;
  const anio = ahora.getFullYear();
  const docsMes = st.documentos.filter(
    (d) => !d.eliminado && Number(d.fechaInsert.slice(0, 4)) === anio && Number(d.fechaInsert.slice(5, 7)) === mes,
  );
  const vigentes = docsMes.filter((d) => d.estado !== "R");
  const aprobadosCodigos: EstadoCodigo[] = ["A", "EP", "F", "DP", "DT"];
  const aprobados = docsMes.filter((d) => aprobadosCodigos.includes(d.estado));

  const criticos = st.productos
    .filter((p) => p.activo)
    .map((p) => ({ id: p.id, codigo: p.codigo, descripcion: p.descripcion, saldo: saldoTotal(p.id) }))
    .filter((p) => p.saldo <= STOCK_CRITICO)
    .sort((a, b) => a.saldo - b.saldo);

  // Últimos 6 meses (monto neto de documentos no rechazados) y embudo de estados del mes.
  const meses: { clave: string; etiqueta: string; monto: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anio, ahora.getMonth() - i, 1);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    meses.push({ clave, etiqueta: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][d.getMonth()], monto: 0 });
  }
  for (const d of st.documentos) {
    if (d.eliminado || d.estado === "R") continue;
    const m = meses.find((x) => x.clave === d.fechaInsert.slice(0, 7));
    if (m) m.monto += d.neto;
  }
  const embudo = (["P", "A", "EP", "F", "DP", "DT", "R"] as EstadoCodigo[]).map((codigo) => {
    const xs = docsMes.filter((d) => d.estado === codigo);
    return { codigo, nombre: nombreEstado(codigo), cantidad: xs.length, monto: xs.reduce((t, d) => t + d.neto, 0) };
  });

  const recientes = incluirDocumentos
    ? (await listarDocumentos({ anio, mes })).slice(0, 6)
    : [];

  return {
    vigentes: vigentes.length,
    monto: vigentes.reduce((t, d) => t + d.neto, 0),
    aprobados: aprobados.length,
    criticos,
    meses,
    embudo,
    recientes,
    mesActual: mes,
    actividad: st.actividad
      .slice()
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 8),
  };
}
