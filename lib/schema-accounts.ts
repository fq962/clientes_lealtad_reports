import { pgTable, varchar, timestamp, uuid, text, boolean, integer } from 'drizzle-orm/pg-core';
import { pgSchema } from 'drizzle-orm/pg-core';

// Schema de accounts
export const accountsSchema = pgSchema('accounts');

// Tabla usuarios_digitales
export const usuariosDigitales = accountsSchema.table('usuarios_digitales', {
  idUsuarioDigital: uuid('id_usuario_digital').primaryKey(),
  fechaCreacion: timestamp('fecha_creacion'),
  ultimoInicioSesion: timestamp('ultimo_inicio_sesion'),
  nombrePreferido: varchar('nombre_preferido', { length: 255 }),
  idContacto: uuid('id_contacto'),
  idEmail: uuid('id_email'),
  emailValidado: boolean('email_validado'),
  idTelefono: uuid('id_telefono'),
  telefonoValidado: boolean('telefono_validado'),
  fotoPerfil: text('foto_perfil'),
});

// Tabla contacts
export const contacts = accountsSchema.table('contacts', {
  idContacto: uuid('id_contacto').primaryKey(),
  nombreCompleto: varchar('nombre_completo', { length: 255 }),
  identificacion: varchar('identificacion', { length: 50 }),
  identificacionTipoDato: varchar('identificacion_tipo_dato', { length: 50 }),
});

// Tabla emails
export const emails = accountsSchema.table('emails', {
  idEmail: uuid('id_email').primaryKey(),
  email: varchar('email', { length: 255 }),
});

// Tabla phone_numbers
export const phoneNumbers = accountsSchema.table('phone_numbers', {
  idTelefono: uuid('id_telefono').primaryKey(),
  telefono: varchar('telefono', { length: 50 }),
});

// Tabla usuarios_digitales_credenciales
export const usuariosDigitalesCredenciales = accountsSchema.table('usuarios_digitales_credenciales', {
  idUsuarioDigital: uuid('id_usuario_digital'),
  idProveedor: integer('id_proveedor'),
});

// Tabla proveedores_autenticacion
export const proveedoresAutenticacion = accountsSchema.table('proveedores_autenticacion', {
  idProveedor: integer('id_proveedor').primaryKey(),
  proveedor: varchar('proveedor', { length: 100 }),
});

// Tabla usuarios_digitales_motivos_afiliacion
export const usuariosDigitalesMotivosAfiliacion = accountsSchema.table('usuarios_digitales_motivos_afiliacion', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  idUsuarioDigital: integer('id_usuario_digital').notNull(),
  motivoNoAfilio: varchar('motivo_no_afilio').notNull(),
});

// Tipos TypeScript
export type UsuarioDigital = typeof usuariosDigitales.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Email = typeof emails.$inferSelect;
export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type ProveedorAutenticacion = typeof proveedoresAutenticacion.$inferSelect;
export type MotivoAfiliacion = typeof usuariosDigitalesMotivosAfiliacion.$inferSelect;
