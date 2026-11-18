import Link from "next/link";
import type { ReactNode } from "react";
import { href, type Params } from "@/lib/urls";
import { nombreEstado } from "@/server/data/types";

export function PageHead({ kicker, title, sub, actions }: { kicker?: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <>
      <header className="page-head">
        <div>
          {kicker && <div className="kicker">{kicker}</div>}
          <h1>{title}</h1>
          {sub && <p className="page-sub">{sub}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </header>
      <hr className="rule" />
    </>
  );
}

export function EstadoChip({ codigo }: { codigo: string }) {
  return <span className={`chip chip-${codigo}`}>{nombreEstado(codigo)}</span>;
}

export function ActivoChip({ activo }: { activo: boolean }) {
  return <span className={`chip ${activo ? "chip-on" : "chip-off"}`}>{activo ? "Activo" : "Desactivado"}</span>;
}

const MENSAJES_OK: Record<string, string> = {
  guardado: "Los cambios se guardaron correctamente.",
  creado: "Registro creado correctamente.",
  estado: "El estado se actualizó.",
  eliminado: "El documento se eliminó.",
  movimiento: "El movimiento quedó registrado en el kardex.",
};

export function OkNotice({ ok, children }: { ok?: string; children?: ReactNode }) {
  if (!ok || !MENSAJES_OK[ok]) return null;
  return (
    <div className="notice" role="status">
      <span>{MENSAJES_OK[ok]}</span>
      {children}
    </div>
  );
}

export function Pager({ base, params, actual, paginas, total, tam }: { base: string; params: Params; actual: number; paginas: number; total: number; tam: number }) {
  const desde = total === 0 ? 0 : (actual - 1) * tam + 1;
  const hasta = Math.min(total, actual * tam);
  return (
    <nav className="pager" aria-label="Paginación">
      <span>{total === 0 ? "Sin registros" : `Mostrando ${desde}–${hasta} de ${total}`}</span>
      {paginas > 1 && (
        <div className="pager-links">
          {actual > 1 ? (
            <Link className="btn btn-sm" href={href(base, { ...params, pagina: actual - 1 })}>← Anterior</Link>
          ) : (
            <span className="btn btn-sm" aria-disabled="true">← Anterior</span>
          )}
          <span style={{ alignSelf: "center" }}>
            {actual} / {paginas}
          </span>
          {actual < paginas ? (
            <Link className="btn btn-sm" href={href(base, { ...params, pagina: actual + 1 })}>Siguiente →</Link>
          ) : (
            <span className="btn btn-sm" aria-disabled="true">Siguiente →</span>
          )}
        </div>
      )}
    </nav>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

/** Cabecera de filtros (GET): campo de búsqueda + filtros extra. */
export function Filtros({ q, placeholder, children, etiqueta = "Buscar" }: { q?: string; placeholder: string; children?: ReactNode; etiqueta?: string }) {
  return (
    <form method="get" className="filters" role="search">
      <div className="field grow">
        <label htmlFor="q">{etiqueta}</label>
        <input id="q" name="q" type="search" className="input" defaultValue={q ?? ""} placeholder={placeholder} maxLength={80} autoComplete="off" />
      </div>
      {children}
      <button type="submit" className="btn">Filtrar</button>
    </form>
  );
}
