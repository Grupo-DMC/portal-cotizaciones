"use client";

import { createContext, useActionState, useContext, useId, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { ActionState } from "@/server/actions/helpers";

const Errores = createContext<ActionState["fieldErrors"]>(undefined);

export function SubmitButton({ children, className = "btn btn-primary" }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? "Procesando…" : children}
    </button>
  );
}

/** Formulario ligado a una Server Action con manejo de errores de negocio y de campo. */
export function ActionForm({
  action,
  children,
  submitLabel = "Guardar",
  cancelHref,
  className,
  encType,
}: {
  action: (prev: ActionState | undefined, fd: FormData) => Promise<ActionState | undefined>;
  children: ReactNode;
  submitLabel?: string;
  cancelHref?: string;
  className?: string;
  encType?: "multipart/form-data";
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className} encType={encType} noValidate>
      {state?.error && (
        <div role="alert" className="form-error">
          {state.error}
        </div>
      )}
      <Errores.Provider value={state?.fieldErrors}>{children}</Errores.Provider>
      <div className="form-actions">
        {cancelHref && (
          <Link href={cancelHref} scroll={false} className="btn">
            Cancelar
          </Link>
        )}
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export interface Opcion { value: string | number; label: string }

interface FieldProps {
  name: string;
  label: string;
  as?: "input" | "select" | "textarea";
  type?: string;
  defaultValue?: string | number | null;
  options?: readonly Opcion[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  inputMode?: "text" | "numeric" | "decimal" | "email" | "tel";
  autoComplete?: string;
  className?: string;
  rows?: number;
  accept?: string;
  vacio?: string;
}

export function Field(p: FieldProps) {
  const errores = useContext(Errores)?.[p.name];
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const describedBy = [errores?.length ? errId : null, p.hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  const comunes = {
    id,
    name: p.name,
    "aria-invalid": errores?.length ? true : undefined,
    "aria-describedby": describedBy,
    required: p.required,
  } as const;
  const valor = p.defaultValue ?? "";

  return (
    <div className={`field ${p.className ?? ""}`}>
      <label htmlFor={id}>
        {p.label}
        {p.required && <span aria-hidden="true"> *</span>}
      </label>
      {p.as === "select" ? (
        <select {...comunes} className="select" defaultValue={String(valor)}>
          {p.vacio !== undefined && <option value="">{p.vacio}</option>}
          {p.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : p.as === "textarea" ? (
        <textarea {...comunes} className="textarea" defaultValue={String(valor)} maxLength={p.maxLength} rows={p.rows} placeholder={p.placeholder} />
      ) : (
        <input
          {...comunes}
          className="input"
          type={p.type ?? "text"}
          defaultValue={p.type === "file" ? undefined : String(valor)}
          placeholder={p.placeholder}
          readOnly={p.readOnly}
          maxLength={p.maxLength}
          min={p.min}
          max={p.max}
          step={p.step}
          inputMode={p.inputMode}
          autoComplete={p.autoComplete}
          accept={p.accept}
        />
      )}
      {p.hint && (
        <span id={hintId} className="hint">
          {p.hint}
        </span>
      )}
      {errores?.length ? (
        <span id={errId} className="err">
          {errores[0]}
        </span>
      ) : null}
    </div>
  );
}

/** Casilla de verificación simple (se envía "on" cuando está marcada). */
export function Check({ name, label, defaultChecked, value = "on" }: { name: string; label: string; defaultChecked?: boolean; value?: string }) {
  return (
    <label className="check">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} />
      <span>{label}</span>
    </label>
  );
}
