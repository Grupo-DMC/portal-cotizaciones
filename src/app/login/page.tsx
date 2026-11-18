import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionUser, rutaSegura } from "@/server/auth/dal";
import { uno, type SearchParams } from "@/lib/urls";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  if (await getSessionUser()) redirect("/inicio");
  const next = rutaSegura(uno(sp, "next")) ?? undefined;
  const demo = process.env.DATA_SOURCE !== "mssql" && process.env.NODE_ENV !== "production";

  return (
    <main className="login">
      <section className="login-left">
        <div className="brand">
          <Image src="/img/dmc.png" alt="Grupo DMC" width={600} height={255} priority />
        </div>
        <div className="login-body">
          <div className="login-panel">
            <h1>Iniciar sesión</h1>
            <hr className="rule" style={{ margin: "16px 0 26px" }} />
            <LoginForm next={next} />
            <p style={{ marginTop: 22, fontSize: 13, color: "var(--color-ink-soft)" }}>
              Acceso restringido a personal autorizado. Los intentos fallidos quedan limitados por seguridad.
            </p>
            {demo && (
              <div className="demo-box">
                <strong>Datos de demostración</strong> · contraseña <code>Demo1234!</code>
                <table>
                  <tbody>
                    <tr><td><code>admin@dmc.cl</code></td><td>Administrador</td></tr>
                    <tr><td><code>mrojas@dmc.cl</code></td><td>Ejecutivo comercial</td></tr>
                    <tr><td><code>imunoz@dmc.cl</code></td><td>Bodega</td></tr>
                    <tr><td><code>varaya@dmc.cl</code></td><td>Gerencia</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="login-dark" aria-hidden="true">
        <div className="word">DMC</div>
        <div className="bar" />
        <div className="sub">Comercializadora DMC S.P.A.</div>
        <div className="foot">
          <span>Sistema de gestión comercial</span>
          <span>V 2.0</span>
        </div>
      </section>
    </main>
  );
}
