/**
 * Catálogo de páginas y permisos.
 *
 * Reemplaza los CSV de `DMC_ROL_PERMISOS` y el mapa ID → página que estaba
 * hardcodeado en Site.Master.cs. Los códigos se conservan (101-402) para poder
 * migrar los roles existentes tal cual.
 */
export interface PaginaDef { codigo: number; href: string; label: string; grupo: GrupoNav }
export type GrupoNav = "Bodega" | "Comercial" | "Documentos" | "Administración";

export const PAGINAS: PaginaDef[] = [
  { codigo: 101, href: "/bodega/inventario", label: "Inventario", grupo: "Bodega" },
  { codigo: 102, href: "/bodega/bodegas", label: "Bodegas", grupo: "Bodega" },
  { codigo: 103, href: "/bodega/movimientos", label: "Movimientos por producto", grupo: "Bodega" },
  { codigo: 104, href: "/bodega/productos", label: "Maestro de productos", grupo: "Bodega" },
  { codigo: 105, href: "/bodega/productos/nuevo", label: "Agregar producto", grupo: "Bodega" },
  { codigo: 106, href: "/bodega/familias", label: "Familias", grupo: "Bodega" },
  { codigo: 107, href: "/bodega/subfamilias", label: "Subfamilias", grupo: "Bodega" },
  { codigo: 108, href: "/bodega/ajuste", label: "Ajuste de inventario", grupo: "Bodega" },
  { codigo: 201, href: "/comercial/clientes", label: "Maestro de clientes", grupo: "Comercial" },
  { codigo: 202, href: "/comercial/precios", label: "Listas de precios", grupo: "Comercial" },
  { codigo: 301, href: "/documentos/emitir", label: "Emitir documento", grupo: "Documentos" },
  { codigo: 302, href: "/documentos", label: "Listado de documentos", grupo: "Documentos" },
  { codigo: 401, href: "/admin/usuarios", label: "Usuarios", grupo: "Administración" },
  { codigo: 402, href: "/admin/roles", label: "Roles y permisos", grupo: "Administración" },
];

export const GRUPOS: GrupoNav[] = ["Bodega", "Comercial", "Documentos", "Administración"];

export const REGIONES = [
  { value: "Arica y Parinacota", label: "XV Arica y Parinacota" },
  { value: "Tarapaca", label: "I Tarapacá" },
  { value: "Antofagasta", label: "II Antofagasta" },
  { value: "Atacama", label: "III Atacama" },
  { value: "Coquimbo", label: "IV Coquimbo" },
  { value: "Valparaiso", label: "V Valparaíso" },
  { value: "R Metropolitana", label: "RM Región Metropolitana" },
  { value: "Libertador General Bernardo O'Hiiggins", label: "VI Libertador Gral. Bernardo O'Higgins" },
  { value: "Maule", label: "VII Maule" },
  { value: "Ñuble", label: "XVI Ñuble" },
  { value: "BioBio", label: "VIII Biobío" },
  { value: "Araucania", label: "IX La Araucanía" },
  { value: "Los Rios", label: "XIV Los Ríos" },
  { value: "Los Lagos", label: "X Los Lagos" },
  { value: "Aysen", label: "XI Aysén" },
  { value: "Magallanes", label: "XII Magallanes y la Antártica Chilena" },
] as const;
