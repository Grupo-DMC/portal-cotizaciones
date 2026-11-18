export const ESTADOS = [
  { codigo: "P", nombre: "Pendiente" },
  { codigo: "A", nombre: "Aceptada" },
  { codigo: "R", nombre: "Rechazada" },
  { codigo: "EP", nombre: "En proceso" },
  { codigo: "F", nombre: "Facturado" },
  { codigo: "DP", nombre: "Desp. parcial" },
  { codigo: "DT", nombre: "Desp. total" },
] as const;
export type EstadoCodigo = (typeof ESTADOS)[number]["codigo"];
export const nombreEstado = (c: string) => ESTADOS.find((e) => e.codigo === c)?.nombre ?? c;

export const TIPOS_DOCUMENTO = [
  { sercue: "0046", nombre: "Cotización" },
  { sercue: "0052", nombre: "Factura" },
] as const;

export { IVA_PCT } from "@/lib/calculo";
export const STOCK_CRITICO = 5;

export interface Rol {
  id: number;
  nombre: string;
  /** Códigos de página permitidos (ver src/server/auth/permisos.ts). */
  paginas: number[];
  /** Estados de documento que este rol puede asignar. */
  estados: EstadoCodigo[];
  activo: boolean;
}

export interface Usuario {
  id: number;
  nombre: string;
  apPaterno: string;
  apMaterno: string;
  correo: string;
  /** scrypt$N$r$p$salt$hash — nunca se envía al cliente. */
  claveHash: string;
  rolId: number;
  activo: boolean;
}

export interface Cliente {
  id: number;
  rut: string;
  razonSocial: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  comuna: string;
  region: string;
  ejecutivoId: number | null;
  listaPrecioId: number;
  activo: boolean;
}

export interface Sucursal {
  id: number;
  clienteId: number;
  nombre: string;
  direccion: string;
  comuna: string;
  region: string;
  encargado: string;
  telefonoEncargado: string;
  emailEncargado: string;
  casaMatriz: boolean;
  activo: boolean;
}

export interface ListaPrecio { id: number; descripcion: string; activo: boolean }
export interface PrecioItem { listaId: number; productoId: number; precioLista: number; precioVenta: number }
export interface Familia { id: number; codigo: string; descripcion: string; activo: boolean }
export interface Subfamilia { id: number; codigo: string; descripcion: string; familiaId: number; activo: boolean }

export type EstadoItem = "OK" | "Reparación" | "Dañado";
export interface Producto {
  id: number;
  codigo: string;
  descripcion: string;
  unidades: number;
  formato: string;
  familiaId: number;
  subfamiliaId: number | null;
  estadoItem: EstadoItem;
  activo: boolean;
  /** data:image/...;base64 — validada (tipo y tamaño) al subirla. */
  imagen: string | null;
}

export interface Bodega { id: number; codigo: string; nombre: string; activo: boolean }
export interface Saldo { productoId: number; bodegaId: number; entradas: number; salidas: number }
export interface Movimiento {
  id: number;
  fecha: string;
  bodegaId: number;
  productoId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  entrada: number;
  salida: number;
  observacion: string;
  usuarioId: number;
}

export interface DocLinea {
  linea: number;
  productoId: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  /** Precio base neto de la lista. */
  valorNeto: number;
  descuento: number;
  /** Precio unitario neto con descuento aplicado. */
  valorUnitario: number;
  totalLinea: number;
}

export interface Documento {
  id: number;
  folio: number;
  sercue: string;
  fecha: string;
  fechaInsert: string;
  clienteId: number;
  sucursalId: number | null;
  usuarioId: number;
  // Instantánea del cliente al momento de cotizar (intencional, se conserva).
  rut: string;
  razonSocial: string;
  direccion: string;
  telefono: string;
  proyecto: string;
  observaciones: string;
  neto: number;
  iva: number;
  total: number;
  estado: EstadoCodigo;
  eliminado: boolean;
  lineas: DocLinea[];
}

export interface Actividad { id: number; fecha: string; texto: string; usuarioId: number }

export interface Store {
  roles: Rol[];
  usuarios: Usuario[];
  clientes: Cliente[];
  sucursales: Sucursal[];
  listas: ListaPrecio[];
  precios: PrecioItem[];
  familias: Familia[];
  subfamilias: Subfamilia[];
  productos: Producto[];
  bodegas: Bodega[];
  saldos: Saldo[];
  movimientos: Movimiento[];
  documentos: Documento[];
  actividad: Actividad[];
  seq: Record<string, number>;
}
