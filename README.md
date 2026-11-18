# DMC · Sistema de cotizaciones

Réplica modernizada del sistema `sys_cot_old` (ASP.NET WebForms) para Comercializadora DMC S.P.A.: cotizaciones, clientes y listas de precios, maestro de productos, bodegas e inventario, usuarios y roles.

**Stack:** Next.js 16 (App Router, Turbopack, `proxy.ts`) · React 19 · Tailwind CSS 4 · TypeScript 5 · Zod 4 · pdf-lib · mssql (preparado, aún no conectado).

> Por ahora **todos los datos son ficticios** (almacén en memoria, semilla determinista). Se reinician al reiniciar el servidor.

## Requisitos

- Node.js 20.9 o superior y npm.
- (Más adelante) SQL Server accesible, solo cuando se conecte la base real.

## Puesta en marcha

```bash
npm install
npm run dev -- -p 3100      # http://localhost:3100
```

En desarrollo no hace falta `.env`: se usan datos ficticios y una clave de sesión fija solo para desarrollo (en producción es obligatorio definir `SESSION_SECRET`).

Producción: `npm run build && npm start` (requiere `SESSION_SECRET`, ver `.env.example`).

Control de calidad: `npm run lint` · `npx tsc --noEmit` · `npm audit --omit=dev`.

### Usuarios de demostración (solo con datos ficticios y fuera de producción)

Contraseña de todos: `Demo1234!`

| Correo | Rol |
|---|---|
| admin@dmc.cl | Administrador |
| mrojas@dmc.cl, csoto@dmc.cl | Ejecutivo comercial |
| imunoz@dmc.cl | Bodega |
| varaya@dmc.cl | Gerencia |
| rcampos@dmc.cl | Inactivo (no puede ingresar) |

## Estructura

```
src/
  proxy.ts               CSP con nonce, redirección a /login (chequeo optimista de cookie)
  app/                   Rutas (login, (app)/inicio, bodega, comercial, documentos, admin, api)
  components/            UI y editor de cotización (cliente)
  lib/                   Funciones puras: formato CLP, RUT, cálculo IVA, permisos, URLs
  server/
    auth/                scrypt, sesión firmada HMAC, DAL (requireUser / requirePermission), rate-limit
    data/                types, seed, store, queries (lecturas), commands (escrituras + reglas de negocio)
    actions/             Server Actions con validación Zod
    db/mssql.ts          Pool SQL Server (perezoso)
    pdf/cotizacion.ts    PDF de cotización con pdf-lib
```

## Qué se corrigió respecto al sistema anterior

- Editar un usuario ahora **actualiza** (antes `SP_ActualizarUsuario` hacía un INSERT).
- Contraseñas con **scrypt** y sal propia (antes texto plano en login); nunca se muestran.
- Totales, IVA y folio se **calculan en el servidor**; el folio es secuencial y atómico (antes `MAX+1` desde el cliente).
- Actualizar un cliente solo sincroniza la **casa matriz**, no todas las sucursales.
- Autorización **en cada página, acción y API** (antes solo ocultaba el menú).
- Documentos facturados / despachados no se pueden editar; las salidas de bodega no pueden superar el saldo.
- Una lista de precios nueva clona los precios de la lista base; los roles ahora son editables.

## Seguridad (resumen)

- Sesión: cookie `httpOnly`, `SameSite=Strict`, `Secure` en producción, 8 h; incluye huella de la contraseña (cambiarla cierra sesiones).
- Login: límite de intentos (5 por cuenta / 30 por IP cada 15 min, **en memoria**: usar Redis o la BD si hay más de una instancia), hash señuelo para igualar tiempos, `next` sin redirección abierta.
- CSP con nonce, `X-Frame-Options: DENY`, `nosniff`, HSTS, Permissions-Policy.
- Toda entrada pasa por Zod; imágenes validadas por firma binaria (PNG/JPG/WebP, ≤ 1 MB); CSV protegido contra inyección de fórmulas.
- Rol y estados permitidos se verifican en el servidor; nadie puede desactivarse ni cambiarse el rol a sí mismo, y el rol Administrador no se puede desactivar ni perder el acceso a usuarios y roles.

## Datos sensibles y Git

- `.gitignore` excluye `.env*` (salvo `.env.example`), claves/certificados, respaldos y volcados de base de datos, exportaciones CSV/Excel, logs y archivos locales de herramientas.
- Nunca subas credenciales de SQL Server ni `SESSION_SECRET`; en producción se inyectan como variables de entorno del servidor.
- Si se sube un secreto por error, **rótalo** (borrar el commit no basta).

## Migración a SQL Server

Ver [`docs/MIGRACION_MSSQL.md`](docs/MIGRACION_MSSQL.md): mapa de cada función de `queries.ts` / `commands.ts` hacia los procedimientos almacenados existentes.
