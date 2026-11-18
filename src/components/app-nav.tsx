"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ItemNav { href: string; label: string }
export interface GrupoNavItem { grupo: string; items: ItemNav[] }

function activo(pathname: string, href: string, todos: string[]) {
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  // Gana el enlace más específico (p. ej. /documentos/emitir sobre /documentos).
  return !todos.some((o) => o !== href && o.length > href.length && (pathname === o || pathname.startsWith(o + "/")));
}

export function AppNav({ grupos, nombre, rol, cerrarSesion }: { grupos: GrupoNavItem[]; nombre: string; rol: string; cerrarSesion: ReactNode }) {
  const pathname = usePathname();
  // El menú móvil se considera abierto solo en la ruta donde se abrió (al navegar se cierra solo).
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null);
  const abierto = abiertoEn === pathname;
  const setAbierto = (v: boolean) => setAbiertoEn(v ? pathname : null);
  const todos = ["/inicio", ...grupos.flatMap((g) => g.items.map((i) => i.href))];

  return (
    <>
      <div className="topbar">
        <Link href="/inicio" aria-label="Ir al inicio">
          <Image src="/img/dmc.png" alt="Grupo DMC" width={600} height={255} priority />
        </Link>
        <button type="button" className="btn btn-sm" aria-expanded={abierto} aria-controls="menu-principal" onClick={() => setAbierto(!abierto)}>
          {abierto ? "Cerrar" : "Menú"}
        </button>
      </div>
      {abierto && <div className="scrim" onClick={() => setAbierto(false)} aria-hidden="true" />}
      <aside id="menu-principal" className="sidebar" data-open={abierto}>
        <Link href="/inicio" className="sidebar-brand" aria-label="Grupo DMC, ir al inicio">
          <Image src="/img/dmc.png" alt="Grupo DMC" width={600} height={255} priority />
          <div className="sidebar-brand-name">Comercializadora DMC S.P.A.</div>
        </Link>
        <nav aria-label="Principal">
          <Link href="/inicio" className="nav-link" aria-current={pathname === "/inicio" ? "page" : undefined}>
            Inicio
          </Link>
          {grupos.map((g) => (
            <div className="nav-group" key={g.grupo}>
              <div className="nav-group-title">{g.grupo}</div>
              {g.items.map((i) => (
                <Link key={i.href} href={i.href} className="nav-link" aria-current={activo(pathname, i.href, todos) ? "page" : undefined}>
                  {i.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="nombre">{nombre}</div>
          <div className="rol">{rol}</div>
          {cerrarSesion}
        </div>
      </aside>
    </>
  );
}
