"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface OpcionCombo { value: number; label: string; sub?: string }

/** Selector con búsqueda (reemplaza a select2): accesible por teclado, sin dependencias. */
export function Combobox({
  options, value, onChange, placeholder, disabled, ariaLabel, id,
}: {
  options: OpcionCombo[];
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const seleccionada = options.find((o) => o.value === value) ?? null;
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [activo, setActivo] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);

  const filtradas = useMemo(() => {
    const n = texto.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (!n) return options.slice(0, 80);
    return options
      .filter((o) => `${o.label} ${o.sub ?? ""}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(n))
      .slice(0, 80);
  }, [options, texto]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) {
        setAbierto(false);
        setTexto("");
      }
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);

  function elegir(o: OpcionCombo) {
    onChange(o.value);
    setAbierto(false);
    setTexto("");
  }

  return (
    <div className="combo" ref={raiz}>
      <input
        id={id}
        className="input"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        aria-activedescendant={abierto && filtradas[activo] ? `${uid}-o${filtradas[activo].value}` : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={abierto ? texto : seleccionada ? seleccionada.label : ""}
        onFocus={() => { setAbierto(true); setActivo(0); }}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActivo(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setAbierto(true); setActivo((a) => Math.min(a + 1, filtradas.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && abierto) { e.preventDefault(); if (filtradas[activo]) elegir(filtradas[activo]); }
          else if (e.key === "Escape") { setAbierto(false); setTexto(""); }
        }}
      />
      {abierto && (
        <ul className="combo-list" role="listbox" id={listId}>
          {filtradas.length === 0 && <li style={{ cursor: "default", color: "var(--color-ink-soft)" }}>Sin resultados</li>}
          {filtradas.map((o, i) => (
            <li
              key={o.value}
              id={`${uid}-o${o.value}`}
              role="option"
              aria-selected={i === activo}
              onMouseDown={(e) => { e.preventDefault(); elegir(o); }}
              onMouseEnter={() => setActivo(i)}
            >
              {o.label}
              {o.sub && <small>{o.sub}</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
