import { pgTable, varchar, timestamp, uuid, text } from 'drizzle-orm/pg-core';

// Definición de la tabla existente para usuarios digitales y contactos de lealtad
// NOTA: Esta tabla ya existe en la base de datos, solo definimos la estructura para las consultas
export const clientesLealtad = pgTable('clientes_lealtad', {
  id: uuid('id').primaryKey(),
  fechaUsuarioDigital: timestamp('fecha_usuario_digital'),
  idUsuarioDigital: varchar('id_usuario_digital', { length: 50 }),
  nombrePreferido: varchar('nombre_preferido', { length: 100 }),
  idContacto: varchar('id_contacto', { length: 50 }),
  nombreCompletoContacto: varchar('nombre_completo_contacto', { length: 200 }),
  identificacion: varchar('identificacion', { length: 50 }),
  tipoIdentificacion: varchar('tipo_identificacion', { length: 50 }),
  correoApp: varchar('correo_app', { length: 255 }),
  telefonoApp: varchar('telefono_app', { length: 50 }),
  fotoPerfilApp: text('foto_perfil_app'),
  creadoEn: timestamp('creado_en'),
  actualizadoEn: timestamp('actualizado_en'),
});

// Tipo TypeScript para las consultas SELECT
export type ClienteLealtad = typeof clientesLealtad.$inferSelect;
