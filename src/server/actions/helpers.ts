import "server-only";
import { z } from "zod";
import { ErrorNegocio } from "@/server/data/store";

export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

/** Valida un FormData con Zod. Devuelve los datos o el estado de error para el formulario. */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): { ok: true; data: z.output<S> } | { ok: false; state: ActionState } {
  const crudo: Record<string, unknown> = {};
  for (const clave of new Set(formData.keys())) {
    const todos = formData.getAll(clave);
    crudo[clave] = todos.length > 1 ? todos : todos[0];
  }
  const r = schema.safeParse(crudo);
  if (r.success) return { ok: true, data: r.data };
  return {
    ok: false,
    state: { error: "Revise los campos marcados.", fieldErrors: z.flattenError(r.error as z.ZodError<Record<string, unknown>>).fieldErrors as Record<string, string[]> },
  };
}

/** Ejecuta un comando de negocio; los ErrorNegocio se convierten en mensaje de formulario. */
export async function conNegocio(fn: () => Promise<unknown>): Promise<ActionState | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    if (e instanceof ErrorNegocio) return { error: e.message };
    throw e;
  }
}

/* ----------------------------------------------------------- Campos reutilizables */
export const texto = (max = 120, minMsg = "Campo obligatorio") =>
  z.string({ error: minMsg }).trim().min(1, minMsg).max(max, `Máximo ${max} caracteres`);
export const textoOpc = (max = 120) => z.string().trim().max(max, `Máximo ${max} caracteres`).default("");
export const idNum = z.coerce.number({ error: "Valor inválido" }).int("Valor inválido").positive("Valor inválido");
export const idOpc = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.coerce.number().int().positive().nullable(),
);
export const check = z.preprocess((v) => v === "on" || v === "true" || v === "1" || v === true, z.boolean());
export const activoSN = z.preprocess((v) => v === "1" || v === "true" || v === "on", z.boolean());
export const monto = z.coerce.number({ error: "Valor inválido" }).int("Debe ser un entero").min(0, "No puede ser negativo").max(2_000_000_000, "Valor demasiado alto");
export const correo = z.string().trim().toLowerCase().max(120).pipe(z.email("Correo inválido"));
