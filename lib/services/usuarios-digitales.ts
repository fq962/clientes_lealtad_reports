import { db } from '../db';
import { 
  usuariosDigitales, 
  contacts, 
  emails, 
  phoneNumbers, 
  usuariosDigitalesCredenciales, 
  proveedoresAutenticacion 
} from '../schema-accounts';
import { eq, sql } from 'drizzle-orm';

// Tipo para el resultado de la consulta
export interface UsuarioDigitalCompleto {
  fechaUsuarioDigital: string | null;
  ultimoInicioSesionApp: string | null;
  idUsuarioDigital: string;
  nombrePreferido: string | null;
  nombreCompletoContacto: string | null;
  identificacion: string | null;
  tipoIdentificacion: string | null;
  idContacto: string | null;
  correoApp: string | null;
  emailValidado: boolean | null;
  metodoAuth: string | null;
  telefonoApp: string | null;
  telefonoValidado: boolean | null;
  fotoPerfilApp: string | null;
}

// Función para obtener usuarios digitales con todos los datos relacionados
export async function obtenerUsuariosDigitalesCompletos(
  fechaInicio?: string,
  fechaFin?: string
): Promise<UsuarioDigitalCompleto[]> {
  try {
    let whereCondition;
    
    if (fechaInicio && fechaFin) {
      // Si ambas fechas son iguales, buscar solo ese día
      if (fechaInicio === fechaFin) {
        whereCondition = sql`${usuariosDigitales.fechaCreacion}::DATE = ${fechaInicio}::DATE`;
      } else {
        // Rango de fechas
        whereCondition = sql`${usuariosDigitales.fechaCreacion}::DATE BETWEEN ${fechaInicio}::DATE AND ${fechaFin}::DATE`;
      }
    } else if (fechaInicio) {
      whereCondition = sql`${usuariosDigitales.fechaCreacion}::DATE >= ${fechaInicio}::DATE`;
    } else if (fechaFin) {
      whereCondition = sql`${usuariosDigitales.fechaCreacion}::DATE <= ${fechaFin}::DATE`;
    }

    // Query exacto como lo pediste, pero solo con las tablas permitidas
    const query = db
      .select({
        // Columnas que pediste específicamente:
        fechaUsuarioDigital: usuariosDigitales.fechaCreacion,           // "Fecha Usuario Digital"
        idUsuarioDigital: usuariosDigitales.idUsuarioDigital,          // "Id Usuario Digital"  
        nombrePreferido: usuariosDigitales.nombrePreferido,            // "Nombre Preferido"
        idContacto: usuariosDigitales.idContacto,                      // "Id Contacto"
        nombreCompletoContacto: contacts.nombreCompleto,               // "Nombre Completo Contacto"
        identificacion: contacts.identificacion,                       // "Identificacion"
        tipoIdentificacion: contacts.identificacionTipoDato,           // "Tipo Identificacion"
        correoApp: emails.email,                                       // "Correo App"
        telefonoApp: phoneNumbers.telefono,                           // "Telefono App"
        fotoPerfilApp: usuariosDigitales.fotoPerfil,                  // "Foto Perfil App"
        
        // Columnas adicionales que están en tu query pero no en la tabla final:
        ultimoInicioSesionApp: usuariosDigitales.ultimoInicioSesion,  // Por si las necesitas
        emailValidado: usuariosDigitales.emailValidado,               // Por si las necesitas
        telefonoValidado: usuariosDigitales.telefonoValidado,         // Por si las necesitas
        metodoAuth: sql<string>`null`,                                 // No disponible por permisos
      })
      .from(usuariosDigitales)
      .leftJoin(emails, eq(usuariosDigitales.idEmail, emails.idEmail))
      .leftJoin(phoneNumbers, eq(usuariosDigitales.idTelefono, phoneNumbers.idTelefono))
      .leftJoin(contacts, eq(usuariosDigitales.idContacto, contacts.idContacto))
      // Nota: Sin acceso a usuarios_digitales_credenciales y proveedores_autenticacion
      .orderBy(usuariosDigitales.fechaCreacion, usuariosDigitales.nombrePreferido);

    // Aplicar condición WHERE si existe
    if (whereCondition) {
      return await query.where(whereCondition);
    }

    return await query;
  } catch (error) {
    console.error('Error obteniendo usuarios digitales completos:', error);
    throw new Error('Error al obtener los datos de usuarios digitales');
  }
}

// Función específica para obtener usuarios de una fecha específica (como en tu query original)
export async function obtenerUsuariosPorFecha(fecha: string): Promise<UsuarioDigitalCompleto[]> {
  return obtenerUsuariosDigitalesCompletos(fecha, fecha);
}
