/** Utilidades para RUT chileno (módulo 11). */

export function limpiarRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function digitoVerificador(cuerpo: string): string {
  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const r = 11 - (suma % 11);
  return r === 11 ? "0" : r === 10 ? "K" : String(r);
}

export function validarRut(rut: string): boolean {
  const l = limpiarRut(rut);
  if (l.length < 2 || l.length > 9) return false;
  const cuerpo = l.slice(0, -1);
  if (!/^\d+$/.test(cuerpo)) return false;
  return digitoVerificador(cuerpo) === l.slice(-1);
}

/** "761234567" → "76.123.456-7" */
export function formatearRut(rut: string): string {
  const l = limpiarRut(rut);
  if (l.length < 2) return rut;
  const cuerpo = l.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpo}-${l.slice(-1)}`;
}
