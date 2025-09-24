import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import * as accountsSchema from "./schema-accounts";

// Configuración de la conexión a PostgreSQL (solo lectura)
// - En Vercel/producción forzamos SSL (cert no verificado) a menos que se desactive explícitamente
// - Soporta DATABASE_URL o parámetros sueltos
const isProduction =
  process.env.ES_PRODUCCION === "true" ||
  process.env.VERCEL === "1" ||
  process.env.NODE_ENV === "production";

const sslRequired = process.env.USAR_CERTIFICADOS === "true" || isProduction;
const sslOption: false | { rejectUnauthorized: boolean } = sslRequired
  ? { rejectUnauthorized: false }
  : false;

const pool = new Pool({
  // Si viene DATABASE_URL, la usamos; si no, usamos los parámetros individuales
  connectionString: process.env.DATABASE_URL,
  host: process.env.DATABASE_URL ? undefined : process.env.XDB_HOST,
  database: process.env.DATABASE_URL ? undefined : process.env.DB_DATABASE,
  port: process.env.DATABASE_URL
    ? undefined
    : parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DATABASE_URL ? undefined : process.env.DB_USER,
  password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
  ssl: sslOption,
  connectionTimeoutMillis: parseInt(
    process.env.DB_CONNECTION_TIMEOUT_MS || "10000"
  ),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || "30000"),
  max: parseInt(process.env.DB_POOL_MAX || (isProduction ? "3" : "10")),
});

// Instancia de Drizzle (solo para consultas SELECT)
export const db = drizzle(pool, { schema: { ...schema, ...accountsSchema } });

// Función para probar la conexión
export async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();
    console.log("✅ Conexión a la base de datos establecida correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error conectando a la base de datos:", error);
    return false;
  }
}
