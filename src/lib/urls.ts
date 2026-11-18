export type Params = Record<string, string | number | undefined | null>;

/** Construye "/ruta?a=1&b=2" omitiendo vacíos. */
export function href(base: string, params: Params = {}): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Primer valor de un parámetro de búsqueda. */
export function uno(sp: Record<string, string | string[] | undefined>, clave: string): string | undefined {
  const v = sp[clave];
  return Array.isArray(v) ? v[0] : v;
}
export function entero(sp: Record<string, string | string[] | undefined>, clave: string): number | undefined {
  const v = uno(sp, clave);
  if (!v || !/^\d{1,9}$/.test(v)) return undefined;
  return Number(v);
}

export const TAM_PAGINA = 15;
export function paginar<T>(filas: T[], pagina: number | undefined, tam = TAM_PAGINA) {
  const total = filas.length;
  const paginas = Math.max(1, Math.ceil(total / tam));
  const actual = Math.min(Math.max(pagina ?? 1, 1), paginas);
  return { filas: filas.slice((actual - 1) * tam, actual * tam), total, paginas, actual, tam };
}
