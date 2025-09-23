import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Configuración para introspección de base de datos existente
  out: './lib/generated-schema',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.XDB_HOST!,
    database: process.env.DB_DATABASE!,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    ssl: process.env.USAR_CERTIFICADOS === 'true' ? { rejectUnauthorized: false } : false,
  },
  
  // Para introspección (generar schema desde DB existente)
  introspect: {
    casing: 'camelCase', // Convertir snake_case a camelCase
  },
  
  // Configuración adicional
  verbose: true,
  strict: false, // Permite flexibilidad con esquemas existentes
});
