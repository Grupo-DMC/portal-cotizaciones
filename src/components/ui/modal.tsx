"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/** Diálogo nativo <dialog>: foco atrapado, Escape y clic en el fondo cierran navegando a closeHref. */
export function Modal({ title, closeHref, wide, children }: { title: string; closeHref: string; wide?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal${wide ? " wide" : ""}`}
      aria-labelledby="modal-titulo"
      onCancel={(e) => {
        e.preventDefault();
        router.push(closeHref, { scroll: false });
      }}
      onClick={(e) => {
        if (e.target === ref.current) router.push(closeHref, { scroll: false });
      }}
    >
      <div className="modal-head">
        <h2 id="modal-titulo">{title}</h2>
        <Link href={closeHref} scroll={false} className="btn btn-sm btn-ghost" aria-label="Cerrar">
          Cerrar ✕
        </Link>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
