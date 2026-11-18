export const IVA_PCT = 19;

export interface LineaCalculo { cantidad: number; valorNeto: number; descuento: number }

/**
 * Cálculo de totales de una cotización (pesos enteros).
 * Es la ÚNICA fórmula: la usa el editor en el navegador para mostrar el resultado
 * y el servidor para recalcular y guardar (nunca se confía en totales enviados).
 */
export function calcularLinea(l: LineaCalculo) {
  const totalLinea = Math.round(l.cantidad * l.valorNeto * (1 - l.descuento / 100));
  const valorUnitario = l.cantidad > 0 ? Math.round(totalLinea / l.cantidad) : 0;
  return { totalLinea, valorUnitario };
}

export function calcularTotales(lineas: LineaCalculo[]) {
  const detalle = lineas.map(calcularLinea);
  const neto = detalle.reduce((t, d) => t + d.totalLinea, 0);
  const iva = Math.round((neto * IVA_PCT) / 100);
  return { detalle, neto, iva, total: neto + iva };
}
