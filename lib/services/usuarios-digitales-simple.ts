import { db } from '../db';
import { usuariosDigitales } from '../schema-accounts';
import { sql } from 'drizzle-orm';

// Tipo simplificado para el resultado (solo tabla principal)
export interface UsuarioDigitalSimple {
  fechaUsuarioDigital: string | null;
  ultimoInicioSesionApp: string | null;
  idUsuarioDigital: string;
  nombrePreferido: string | null;
  idContacto: string | null;
  emailValidado: boolean | null;
  telefonoValidado: boolean | null;
  fotoPerfilApp: string | null;
}

// Función simplificada que solo usa la tabla usuarios_digitales
export async function obtenerUsuariosDigitalesSimple(
  fechaInicio?: string,
  fechaFin?: string
): Promise<UsuarioDigitalSimple[]> {
  try {
    let whereCondition;
    
    if (fechaInicio && fechaFin) {
      if (fechaInicio === fechaFin) {
        whereCondition = sql`${usuariosDigitales.fechaCreacion}::DATE = ${fechaInicio}::DATE`;
      } else {
        whereCondition = sql`${usuariosDigitales.fechaCreacion}::DATE BETWEEN ${fechaInicio}::DATE AND ${fechaFin}::DATE`;
      }
    } else if (fechaInicio) {
      whereCondition = sql`${usuariosDigitales.fechaCreacion}::DATE >= ${fechaInicio}::DATE`;
    } else if (fechaFin) {
      whereCondition = sql`${usuariosDigitales.fechaCreacion}::DATE <= ${fechaFin}::DATE`;
    }

    const query = db
      .select({
        fechaUsuarioDigital: usuariosDigitales.fechaCreacion,
        ultimoInicioSesionApp: usuariosDigitales.ultimoInicioSesion,
        idUsuarioDigital: usuariosDigitales.idUsuarioDigital,
        nombrePreferido: usuariosDigitales.nombrePreferido,
        idContacto: usuariosDigitales.idContacto,
        emailValidado: usuariosDigitales.emailValidado,
        telefonoValidado: usuariosDigitales.telefonoValidado,
        fotoPerfilApp: usuariosDigitales.fotoPerfil,
      })
      .from(usuariosDigitales)
      .orderBy(usuariosDigitales.fechaCreacion, usuariosDigitales.nombrePreferido);

    // Aplicar condición WHERE si existe
    if (whereCondition) {
      return await query.where(whereCondition);
    }

    return await query;
  } catch (error) {
    console.error('Error obteniendo usuarios digitales simples:', error);
    throw new Error('Error al obtener los datos de usuarios digitales');
  }
}
