"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { iniciarSesion } from "./actions";

function Entrar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={pending} aria-busy={pending}>
      {pending ? "Verificando…" : "Entrar"}
    </button>
  );
}

export function LoginForm({ next, correoDemo }: { next?: string; correoDemo?: string }) {
  const [state, action] = useActionState(iniciarSesion, undefined);
  return (
    <form action={action} noValidate style={{ display: "grid", gap: 18 }}>
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && (
        <div role="alert" className="form-error" style={{ margin: 0 }}>
          {state.error}
        </div>
      )}
      <div className="field">
        <label htmlFor="correo">Correo</label>
        <input id="correo" name="correo" type="email" className="input" autoComplete="username" required defaultValue={correoDemo} placeholder="nombre@dmc.cl" maxLength={120} />
      </div>
      <div className="field">
        <label htmlFor="clave">Contraseña</label>
        <input id="clave" name="clave" type="password" className="input" autoComplete="current-password" required maxLength={200} />
      </div>
      <Entrar />
    </form>
  );
}
