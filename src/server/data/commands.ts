import "server-only";
import { hashPassword } from "@/server/auth/password";
import { calcularTotales } from "@/lib/calculo";
import { ErrorNegocio, getStore, nextId, norm } from "./store";
import {
  type Cliente, type DocLinea, type EstadoCodigo, type EstadoItem, type Sucursal,
} from "./types";

const s = () => getStore();
const registrar = (usuarioId: number, texto: string) =>
  s().actividad.push({ id: nextId("actividad"), fecha: new Date().toISOString(), texto, usuarioId });

/* ------------------------------------------------------------------ Usuarios */
export interface UsuarioInput { nombre: string; apPaterno: string; apMaterno: string; correo: string; rolId: number; activo: boolean; clave?: string }

export async function crearUsuario(i: UsuarioInput & { clave: string }) {
  if (s().usuarios.some((u) => u.correo.toLowerCase() === i.correo.toLowerCase())) throw new ErrorNegocio("Ya existe un usuario con ese correo.");
  if (!s().roles.some((r) => r.id === i.rolId && r.activo)) throw new ErrorNegocio("El rol seleccionado no es válido.");
  s().usuarios.push({
    id: nextId("usuario"), nombre: i.nombre, apPaterno: i.apPaterno, apMaterno: i.apMaterno,
    correo: i.correo.toLowerCase(), claveHash: hashPassword(i.clave), rolId: i.rolId, activo: i.activo,
  });
}

/** Corrige el SP original (SP_ActualizarUsuario hacía INSERT): aquí realmente actualiza. */
export async function actualizarUsuario(id: number, i: UsuarioInput, actorId: number) {
  const u = s().usuarios.find((x) => x.id === id);
  if (!u) throw new ErrorNegocio("El usuario no existe.");
  if (s().usuarios.some((x) => x.id !== id && x.correo.toLowerCase() === i.correo.toLowerCase())) throw new ErrorNegocio("Ya existe un usuario con ese correo.");
  if (!s().roles.some((r) => r.id === i.rolId && r.activo)) throw new ErrorNegocio("El rol seleccionado no es válido.");
  if (id === actorId && (!i.activo || i.rolId !== u.rolId)) throw new ErrorNegocio("No puede desactivarse ni cambiar su propio rol.");
  Object.assign(u, { nombre: i.nombre, apPaterno: i.apPaterno, apMaterno: i.apMaterno, correo: i.correo.toLowerCase(), rolId: i.rolId, activo: i.activo });
  if (i.clave) u.claveHash = hashPassword(i.clave);
}

export async function alternarUsuario(id: number, actorId: number) {
  const u = s().usuarios.find((x) => x.id === id);
  if (!u) throw new ErrorNegocio("El usuario no existe.");
  if (id === actorId) throw new ErrorNegocio("No puede desactivar su propio usuario.");
  u.activo = !u.activo;
}

/* --------------------------------------------------------------------- Roles */
export async function guardarRol(id: number | null, i: { nombre: string; paginas: number[]; estados: EstadoCodigo[]; activo: boolean }) {
  if (s().roles.some((r) => r.id !== id && norm(r.nombre) === norm(i.nombre))) throw new ErrorNegocio("Ya existe un rol con ese nombre.");
  if (id == null) {
    s().roles.push({ id: nextId("rol"), ...i });
    return;
  }
  const r = s().roles.find((x) => x.id === id);
  if (!r) throw new ErrorNegocio("El rol no existe.");
  if (id === 1 && !i.activo) throw new ErrorNegocio("El rol Administrador no puede desactivarse.");
  if (id === 1 && !(i.paginas.includes(401) && i.paginas.includes(402))) throw new ErrorNegocio("El Administrador debe conservar el acceso a usuarios y roles.");
  Object.assign(r, i);
}

/* ------------------------------------------------------------------ Clientes */
export interface ClienteInput {
  rut: string; razonSocial: string; contacto: string; telefono: string; email: string;
  direccion: string; comuna: string; region: string; ejecutivoId: number | null; listaPrecioId: number; activo: boolean;
}

export async function crearCliente(i: ClienteInput) {
  if (s().clientes.some((c) => c.rut === i.rut)) throw new ErrorNegocio("Ya existe un cliente con ese RUT.");
  if (!s().listas.some((l) => l.id === i.listaPrecioId)) throw new ErrorNegocio("La lista de precios no es válida.");
  const c: Cliente = { id: nextId("cliente"), ...i };
  s().clientes.push(c);
  // Alta compuesta: el cliente nace con su casa matriz.
  s().sucursales.push({
    id: nextId("sucursal"), clienteId: c.id, nombre: "Casa matriz", direccion: i.direccion, comuna: i.comuna, region: i.region,
    encargado: i.contacto, telefonoEncargado: i.telefono, emailEncargado: i.email, casaMatriz: true, activo: true,
  });
}

/**
 * Corrige SP_ActualizarCliente: el original pisaba los datos de TODAS las sucursales.
 * Aquí solo se sincroniza la casa matriz.
 */
export async function actualizarCliente(id: number, i: ClienteInput) {
  const c = s().clientes.find((x) => x.id === id);
  if (!c) throw new ErrorNegocio("El cliente no existe.");
  if (s().clientes.some((x) => x.id !== id && x.rut === i.rut)) throw new ErrorNegocio("Ya existe un cliente con ese RUT.");
  Object.assign(c, i);
  const matriz = s().sucursales.find((x) => x.clienteId === id && x.casaMatriz);
  if (matriz) Object.assign(matriz, { direccion: i.direccion, comuna: i.comuna, region: i.region, encargado: i.contacto, telefonoEncargado: i.telefono, emailEncargado: i.email });
}

export async function alternarCliente(id: number) {
  const c = s().clientes.find((x) => x.id === id);
  if (!c) throw new ErrorNegocio("El cliente no existe.");
  c.activo = !c.activo;
}

export type SucursalInput = Omit<Sucursal, "id" | "clienteId">;
export async function guardarSucursal(clienteId: number, id: number | null, i: SucursalInput) {
  if (!s().clientes.some((c) => c.id === clienteId)) throw new ErrorNegocio("El cliente no existe.");
  if (i.casaMatriz) s().sucursales.filter((x) => x.clienteId === clienteId && x.id !== id).forEach((x) => (x.casaMatriz = false));
  if (id == null) {
    s().sucursales.push({ id: nextId("sucursal"), clienteId, ...i });
    return;
  }
  const x = s().sucursales.find((y) => y.id === id && y.clienteId === clienteId);
  if (!x) throw new ErrorNegocio("La sucursal no existe.");
  Object.assign(x, i);
}

/* ------------------------------------------------------------------- Precios */
export async function crearLista(descripcion: string) {
  if (s().listas.some((l) => norm(l.descripcion) === norm(descripcion))) throw new ErrorNegocio("Ya existe una lista con esa descripción.");
  const id = nextId("lista");
  s().listas.push({ id, descripcion, activo: true });
  // Regla recuperada de LISTA_PRECIOS_CheckifExist: una lista nueva clona los precios de la lista base.
  for (const p of s().precios.filter((x) => x.listaId === 1)) s().precios.push({ ...p, listaId: id });
}
export async function actualizarLista(id: number, descripcion: string, activo: boolean) {
  const l = s().listas.find((x) => x.id === id);
  if (!l) throw new ErrorNegocio("La lista no existe.");
  if (s().listas.some((x) => x.id !== id && norm(x.descripcion) === norm(descripcion))) throw new ErrorNegocio("Ya existe una lista con esa descripción.");
  l.descripcion = descripcion;
  l.activo = activo;
}
export async function guardarPrecio(listaId: number, productoId: number, precioLista: number, precioVenta: number) {
  if (!s().listas.some((l) => l.id === listaId)) throw new ErrorNegocio("La lista no existe.");
  if (!s().productos.some((p) => p.id === productoId)) throw new ErrorNegocio("El producto no existe.");
  const x = s().precios.find((p) => p.listaId === listaId && p.productoId === productoId);
  if (x) Object.assign(x, { precioLista, precioVenta });
  else s().precios.push({ listaId, productoId, precioLista, precioVenta });
}

/* ------------------------------------------------------------------ Catálogo */
export async function guardarFamilia(id: number | null, codigo: string, descripcion: string) {
  if (s().familias.some((f) => f.id !== id && norm(f.codigo) === norm(codigo))) throw new ErrorNegocio("Ya existe una familia con ese código.");
  if (id == null) s().familias.push({ id: nextId("familia"), codigo, descripcion, activo: true });
  else {
    const f = s().familias.find((x) => x.id === id);
    if (!f) throw new ErrorNegocio("La familia no existe.");
    Object.assign(f, { codigo, descripcion });
  }
}
export async function alternarFamilia(id: number) {
  const f = s().familias.find((x) => x.id === id);
  if (!f) throw new ErrorNegocio("La familia no existe.");
  f.activo = !f.activo;
}
export async function guardarSubfamilia(id: number | null, codigo: string, descripcion: string, familiaId: number) {
  if (!s().familias.some((f) => f.id === familiaId)) throw new ErrorNegocio("La familia no es válida.");
  if (s().subfamilias.some((x) => x.id !== id && norm(x.codigo) === norm(codigo))) throw new ErrorNegocio("Ya existe una subfamilia con ese código.");
  if (id == null) s().subfamilias.push({ id: nextId("subfamilia"), codigo, descripcion, familiaId, activo: true });
  else {
    const x = s().subfamilias.find((y) => y.id === id);
    if (!x) throw new ErrorNegocio("La subfamilia no existe.");
    Object.assign(x, { codigo, descripcion, familiaId });
  }
}
export async function alternarSubfamilia(id: number) {
  const x = s().subfamilias.find((y) => y.id === id);
  if (!x) throw new ErrorNegocio("La subfamilia no existe.");
  x.activo = !x.activo;
}

export interface ProductoInput {
  codigo: string; descripcion: string; unidades: number; formato: string; familiaId: number;
  subfamiliaId: number | null; estadoItem: EstadoItem; activo: boolean; imagen?: string | null;
}
function validarClasificacion(i: ProductoInput) {
  if (!s().familias.some((f) => f.id === i.familiaId)) throw new ErrorNegocio("La familia no es válida.");
  if (i.subfamiliaId != null) {
    const sf = s().subfamilias.find((x) => x.id === i.subfamiliaId);
    if (!sf || sf.familiaId !== i.familiaId) throw new ErrorNegocio("La subfamilia no pertenece a la familia elegida.");
  }
}
export async function crearProducto(i: ProductoInput) {
  if (s().productos.some((p) => norm(p.codigo) === norm(i.codigo))) throw new ErrorNegocio("Ya existe un producto con ese código.");
  validarClasificacion(i);
  const id = nextId("producto");
  s().productos.push({ id, ...i, imagen: i.imagen ?? null });
  // El producto nace en la lista base para poder cotizarse (se ajusta luego en Precios).
  for (const l of s().listas) s().precios.push({ listaId: l.id, productoId: id, precioLista: 0, precioVenta: 0 });
}
export async function actualizarProducto(id: number, i: ProductoInput) {
  const p = s().productos.find((x) => x.id === id);
  if (!p) throw new ErrorNegocio("El producto no existe.");
  if (s().productos.some((x) => x.id !== id && norm(x.codigo) === norm(i.codigo))) throw new ErrorNegocio("Ya existe un producto con ese código.");
  validarClasificacion(i);
  const { imagen, ...resto } = i;
  Object.assign(p, resto);
  if (imagen !== undefined) p.imagen = imagen; // undefined = conservar la actual
}

/* ------------------------------------------------------------------- Bodegas */
export async function guardarBodega(id: number | null, codigo: string, nombre: string) {
  if (s().bodegas.some((b) => b.id !== id && norm(b.codigo) === norm(codigo))) throw new ErrorNegocio("Ya existe una bodega con ese código.");
  if (id == null) s().bodegas.push({ id: nextId("bodega"), codigo, nombre, activo: true });
  else {
    const b = s().bodegas.find((x) => x.id === id);
    if (!b) throw new ErrorNegocio("La bodega no existe.");
    Object.assign(b, { codigo, nombre });
  }
}
export async function alternarBodega(id: number) {
  const b = s().bodegas.find((x) => x.id === id);
  if (!b) throw new ErrorNegocio("La bodega no existe.");
  b.activo = !b.activo;
}

export interface MovimientoInput {
  productoId: number; bodegaId: number; tipo: "E" | "S"; cantidad: number;
  tipoDocumento: string; numeroDocumento: string; observacion: string;
}
/** Unifica SP_IngresarAjusteInventario / SP_ActualizarInventario: saldo + kardex en una sola operación. */
export async function registrarMovimiento(i: MovimientoInput, usuarioId: number) {
  const prod = s().productos.find((p) => p.id === i.productoId);
  const bod = s().bodegas.find((b) => b.id === i.bodegaId);
  if (!prod) throw new ErrorNegocio("El producto no existe.");
  if (!bod || !bod.activo) throw new ErrorNegocio("La bodega no existe o está desactivada.");
  let saldo = s().saldos.find((x) => x.productoId === i.productoId && x.bodegaId === i.bodegaId);
  if (!saldo) {
    saldo = { productoId: i.productoId, bodegaId: i.bodegaId, entradas: 0, salidas: 0 };
    s().saldos.push(saldo);
  }
  if (i.tipo === "S" && saldo.entradas - saldo.salidas < i.cantidad) {
    throw new ErrorNegocio(`Saldo insuficiente en ${bod.nombre}: disponible ${saldo.entradas - saldo.salidas}.`);
  }
  if (i.tipo === "E") saldo.entradas += i.cantidad;
  else saldo.salidas += i.cantidad;
  s().movimientos.push({
    id: nextId("movimiento"), fecha: new Date().toISOString().slice(0, 10), bodegaId: i.bodegaId, productoId: i.productoId,
    tipoDocumento: i.tipoDocumento, numeroDocumento: i.numeroDocumento, entrada: i.tipo === "E" ? i.cantidad : 0,
    salida: i.tipo === "S" ? i.cantidad : 0, observacion: i.observacion, usuarioId,
  });
  registrar(usuarioId, `${i.tipo === "E" ? "Entrada" : "Salida"} de ${i.cantidad} × ${prod.codigo}`);
}

/* --------------------------------------------------------------- Documentos */
export interface CotizacionInput {
  clienteId: number; sucursalId: number | null; proyecto: string; fecha: string; observaciones: string;
  lineas: { productoId: number; descripcion: string; cantidad: number; valorNeto: number; descuento: number }[];
}

export async function guardarCotizacion(
  i: CotizacionInput,
  usuarioId: number,
  modo: { tipo: "nueva" } | { tipo: "editar"; id: number },
) {
  const cliente = s().clientes.find((c) => c.id === i.clienteId);
  if (!cliente) throw new ErrorNegocio("Seleccione un cliente válido.");
  const suc = i.sucursalId ? s().sucursales.find((x) => x.id === i.sucursalId && x.clienteId === cliente.id) : null;
  if (i.sucursalId && !suc) throw new ErrorNegocio("La sucursal no pertenece al cliente.");
  if (i.lineas.length === 0) throw new ErrorNegocio("Agregue al menos una línea de producto.");

  const lineas: DocLinea[] = [];
  const t = calcularTotales(i.lineas);
  for (const [idx, l] of i.lineas.entries()) {
    const p = s().productos.find((x) => x.id === l.productoId);
    if (!p) throw new ErrorNegocio(`La línea ${idx + 1} tiene un producto inválido.`);
    lineas.push({
      linea: idx + 1, productoId: p.id, codigo: p.codigo, descripcion: l.descripcion || p.descripcion, cantidad: l.cantidad,
      valorNeto: l.valorNeto, descuento: l.descuento, valorUnitario: t.detalle[idx].valorUnitario, totalLinea: t.detalle[idx].totalLinea,
    });
  }
  const snapshot = {
    clienteId: cliente.id, sucursalId: suc?.id ?? null, rut: cliente.rut, razonSocial: cliente.razonSocial,
    direccion: suc?.direccion ?? cliente.direccion, telefono: cliente.telefono, proyecto: i.proyecto,
    observaciones: i.observaciones, fecha: i.fecha, neto: t.neto, iva: t.iva, total: t.total, lineas,
  };

  if (modo.tipo === "nueva") {
    // Folio correlativo atómico (el original usaba MAX+1 sin bloqueo → colisiones).
    const folio = nextId("folio");
    const id = nextId("documento");
    s().documentos.push({
      id, folio, sercue: "0046", fechaInsert: new Date().toISOString(), usuarioId, estado: "P", eliminado: false, ...snapshot,
    });
    registrar(usuarioId, `Cotización ${folio} emitida`);
    return { id, folio };
  }
  const d = s().documentos.find((x) => x.id === modo.id && !x.eliminado);
  if (!d) throw new ErrorNegocio("El documento no existe.");
  if (d.estado === "F" || d.estado === "DP" || d.estado === "DT") {
    throw new ErrorNegocio("Un documento facturado o despachado no se puede editar. Clónelo para crear uno nuevo.");
  }
  Object.assign(d, snapshot);
  registrar(usuarioId, `Cotización ${d.folio} actualizada`);
  return { id: d.id, folio: d.folio };
}

export async function cambiarEstado(documentoId: number, estado: EstadoCodigo, usuarioId: number) {
  const d = s().documentos.find((x) => x.id === documentoId && !x.eliminado);
  if (!d) throw new ErrorNegocio("El documento no existe.");
  d.estado = estado;
  registrar(usuarioId, `Cotización ${d.folio}: estado → ${estado}`);
}

export async function eliminarDocumento(documentoId: number, usuarioId: number) {
  const d = s().documentos.find((x) => x.id === documentoId && !x.eliminado);
  if (!d) throw new ErrorNegocio("El documento no existe.");
  d.eliminado = true; // borrado lógico, como en el original
  registrar(usuarioId, `Cotización ${d.folio} eliminada`);
}

