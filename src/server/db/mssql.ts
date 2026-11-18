import "server-only";
import sql from "mssql";

/**
 * Conexión a SQL Server (lista para usar; hoy la app trabaja con datos ficticios).
 *
 * Variables de entorno (nunca en el repositorio):
 *   DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT (opcional, 1433)
 *   DB_ENCRYPT=true  → TLS obligatorio (el sistema original viajaba sin cifrar)
 *   DB_TRUST_CERT=false
 *
 * Toda consulta debe ser parametrizada: `request.input("nombre", sql.NVarChar, valor)`.
 * Nunca concatenar valores del usuario en el texto SQL.
 */
const g = globalThis as unknown as { __dmcPool?: Promise<sql.ConnectionPool> };

function config(): sql.config {
  const { DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (!DB_SERVER || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error("Faltan variables de entorno de base de datos (DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD).");
  }
  return {
    server: DB_SERVER,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    port: Number(process.env.DB_PORT ?? 1433),
    options: {
      encrypt: process.env.DB_ENCRYPT !== "false",
      trustServerCertificate: process.env.DB_TRUST_CERT === "true",
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 15000,
  };
}

export function getPool(): Promise<sql.ConnectionPool> {
  g.__dmcPool ??= new sql.ConnectionPool(config()).connect().catch((e) => {
    g.__dmcPool = undefined;
    throw e;
  });
  return g.__dmcPool;
}

export { sql };
