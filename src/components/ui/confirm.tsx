"use client";

import type { ReactNode } from "react";

/** Formulario con confirmación antes de enviarse (acciones destructivas). */
export function ConfirmForm({
  action,
  mensaje,
  children,
  className = "link-action danger",
}: {
  action: () => Promise<void>;
  mensaje: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(mensaje)) e.preventDefault();
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
