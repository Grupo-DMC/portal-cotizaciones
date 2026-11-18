import { AppNav } from "@/components/app-nav";
import { cerrarSesion } from "@/app/login/actions";
import { puede, requireUser } from "@/server/auth/dal";
import { GRUPOS, PAGINAS } from "@/lib/permisos";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // El menú muestra solo lo que el rol puede abrir (la autorización real se hace en cada página/acción).
  const grupos = GRUPOS.map((g) => ({
    grupo: g,
    items: PAGINAS.filter((p) => p.grupo === g && puede(user, p.codigo) && p.codigo !== 105).map((p) => ({ href: p.href, label: p.label })),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="shell">
      <AppNav
        grupos={grupos}
        nombre={user.nombre}
        rol={user.rol.nombre}
        cerrarSesion={
          <form action={cerrarSesion}>
            <button type="submit" className="btn btn-sm">
              Cerrar sesión
            </button>
          </form>
        }
      />
      <main className="main" id="contenido">
        {children}
      </main>
    </div>
  );
}
