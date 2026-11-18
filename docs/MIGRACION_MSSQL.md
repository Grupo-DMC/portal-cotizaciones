# Migración de datos ficticios a SQL Server

La UI, las Server Actions y las rutas **no conocen la fuente de datos**: solo llaman a
`src/server/data/queries.ts` (lecturas) y `src/server/data/commands.ts` (escrituras y reglas de negocio).
Para pasar a SQL Server hay que reemplazar el cuerpo de esas funciones manteniendo firmas y tipos
(`src/server/data/types.ts`). El pool ya existe en `src/server/db/mssql.ts` (`getPool()`).

## Pasos

1. Configurar `DB_*` y `DATA_SOURCE=mssql` (ver `.env.example`).
2. Crear `src/server/data/mssql/` con un repositorio por agregado y elegir la implementación según `DATA_SOURCE`.
3. Usar siempre consultas **parametrizadas** (`request.input(...)`) o los SP; nunca concatenar texto.
4. Migrar claves: la tabla `TBUSUARIO` guarda texto plano / SHA-256. Añadir columna `ClaveHash` (formato `scrypt$N$r$p$sal$hash`, ver `auth/password.ts`) y forzar cambio de clave en el primer ingreso.
5. Reemplazar el rate-limit en memoria (`auth/rate-limit.ts`) por tabla/Redis si hay más de una instancia.
6. `SESSION_SECRET` obligatorio; credenciales de demostración desaparecen solas con `DATA_SOURCE=mssql`.

## Mapa de funciones → stored procedures

Fuente: `sys_cot_old/DMC/analisis_dmc_cotizaciones.md` y `sp_definitions_dmc.sql`.

### Usuarios y roles
| Función nueva | SP / tabla anterior | Nota |
|---|---|---|
| `usuarioPorCorreo` (login) | `SP_VerificarUsuario` | **No** comparar clave en SQL: leer fila y verificar con `verifyPassword`. |
| `listarUsuarios` | `SP_ListarUsuarios` | |
| `crearUsuario` | `SP_AgregarUsuario` | Guardar hash scrypt, no `FN_GeneralContraseña`. |
| `actualizarUsuario` | `SP_ActualizarUsuario` | El SP original hace INSERT: escribir un `UPDATE` real. |
| `alternarUsuario` | `SP_ActualizarEstadoUsuario` | |
| `listarRoles`, `guardarRol` | `SP_ListarRoles`, tabla `DMC_ROL_PERMISOS` | Permisos como CSV de páginas (`STRING_SPLIT`) → mejor tabla relacional. |

### Clientes y precios
| Función | SP anterior |
|---|---|
| `listarClientes` | `SP_ListarClientes` |
| `crearCliente` | `SP_AgregarCliente` (omitir `SUCURSAL_CLIENTE`, es redundante) |
| `actualizarCliente` | `SP_ActualizarCliente` (limitar el UPDATE de SUCURSAL a `CASA_MATRIZ = 1`) |
| `sucursalesDeCliente`, `guardarSucursal` | `SP_ListarSucursal`, `SP_AgregarSucursal`, `SP_ActualizarSucursal` |
| `listarListas`, `crearLista`, `actualizarLista` | `SP_ListarPrecioCliente`, `SP_AgregarPrecioCliente`, `SP_ActualizarListaPrecios` |
| `preciosDeLista`, `guardarPrecio` | `SP_ObtenerDetalleProductos`, `SP_ActualizarPrecios` |
| `mapaPrecios` (editor de cotización) | `SP_ListarPrecios` (por producto y cliente) |

### Bodega
| Función | SP anterior |
|---|---|
| `listarFamilias`, `guardarFamilia`, `alternarFamilia` | `SP_ListarFamilias`, `SP_AgregarFamilia`, `SP_ActualizarFamilia`, `SP_Activar_DesactivarFamilia` |
| `listarSubfamilias`, `guardarSubfamilia`, `alternarSubfamilia` | `SP_ListarSubFamilias`, `SP_AgregarSubFamilia`, `SP_ActualizarSubFamilia`, `SP_Activar_DesactivarSubFamilia` |
| `listarProductos`, `productoPorId`, `crearProducto`, `actualizarProducto` | `SP_ListarMaestroProductos`, `SP_AgregarMaestroProducto`, `SP_ActualizarProductoMaestro` (imagen `VARBINARY(MAX)`) |
| `listarBodegas`, `guardarBodega`, `alternarBodega` | `SP_ListarBodega`, `SP_ActualizarBodega`, `SP_Activar_DesactivarBodega` |
| `saldoPorBodega`, `saldosGenerales`, `inventario` | `SP_VerBodegaMaestroProducto`, `SP_ListarSaldoGenerales`, `SP_ListarInventario` |
| `movimientosFiltrados` | `SP_ListarMovimientoPorProducto` |
| `registrarMovimiento` | `SP_ModificarInventario` + `SP_ActualizarSaldo` — **hacer ambos en una sola transacción**; hoy `inventario` y `saldo` duplican contabilidad. Validar `salida ≤ saldo` con `UPDATE … WHERE saldo >= @cant`. |

### Documentos
| Función | SP anterior | Nota |
|---|---|---|
| `listarDocumentos` | `SP_ListadoDocumentos` | Parámetros año, mes, cliente, tipo, texto. |
| `documentoPorId` | `SP_ObtenerDatosCotizacion` + `SP_ObtenerDetallesCotizacion` / `SP_DatosPDF` | |
| `folioSiguiente` / `guardarCotizacion` (crear) | `SP_AgregarCotizacion` (TVP `CotizacionDetalleType`) | Folio con `SEQUENCE` o `UPDLOCK, HOLDLOCK` dentro de la transacción; **no** `MAX+1` previo. |
| `guardarCotizacion` (editar) | `SP_ActualizarCotizacion` | Recalcular neto/IVA/total en el servidor (`lib/calculo.ts`). |
| `cambiarEstado` | `SP_ActualizarEstadoCot` | Validar que el estado esté permitido para el rol. |
| `eliminarDocumento` | `SP_EliminarDocumentacion` | Borrado lógico (`Eliminado = 1`). |
| `resumenInicio` | consultas agregadas sobre `DOC_ADMINISTRATIVO` | Agrupar por estado y mes en SQL. |

## Reglas de negocio que deben conservarse

Están en `commands.ts` y se prueban igual contra SQL: documentos F/DP/DT no editables; salida ≤ saldo; no desactivarse ni cambiar el propio rol; el rol Administrador conserva acceso a usuarios y roles; folio único y secuencial; totales siempre recalculados.
