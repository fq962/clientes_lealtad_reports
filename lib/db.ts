import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as accountsSchema from './schema-accounts';

// Configuración de la conexión a PostgreSQL (solo lectura)
const pool = new Pool({
  host: process.env.XDB_HOST,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false, // Usar la configuración que funciona
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

// Instancia de Drizzle (solo para consultas SELECT)
export const db = drizzle(pool, { schema: { ...schema, ...accountsSchema } });

// Función para probar la conexión
export async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Conexión a la base de datos establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    return false;
  }
}
