import "server-only";

/**
 * Limitador de intentos de inicio de sesión (en memoria).
 * Nota: con varias instancias del servidor debe moverse a Redis o a la BD.
 */
interface Registro { fallos: number; desde: number; bloqueadoHasta: number }
const g = globalThis as unknown as { __dmcRL?: Map<string, Registro> };
const mapa = (g.__dmcRL ??= new Map<string, Registro>());

const VENTANA_MS = 15 * 60 * 1000;

function leer(clave: string): Registro {
  const ahora = Date.now();
  const r = mapa.get(clave);
  if (!r || ahora - r.desde > VENTANA_MS) {
    const nuevo = { fallos: 0, desde: ahora, bloqueadoHasta: 0 };
    mapa.set(clave, nuevo);
    return nuevo;
  }
  return r;
}

export function minutosBloqueado(clave: string): number {
  const r = leer(clave);
  const resto = r.bloqueadoHasta - Date.now();
  return resto > 0 ? Math.ceil(resto / 60000) : 0;
}

export function registrarFallo(clave: string, maximo: number) {
  const r = leer(clave);
  r.fallos += 1;
  if (r.fallos >= maximo) r.bloqueadoHasta = Date.now() + VENTANA_MS;
}

export function limpiar(clave: string) {
  mapa.delete(clave);
}

// Barrido ocasional para que el mapa no crezca sin límite.
if (mapa.size > 5000) {
  const ahora = Date.now();
  for (const [k, v] of mapa) if (ahora - v.desde > VENTANA_MS) mapa.delete(k);
}
