import { db } from '../db';
import { clientesLealtad, type ClienteLealtad } from '../schema';
import { and, gte, lte, desc, eq } from 'drizzle-orm';

// Servicio para obtener clientes con filtros de fecha
export async function obtenerClientesLealtad(
  fechaInicio?: string,
  fechaFin?: string
): Promise<ClienteLealtad[]> {
  try {
    const whereConditions = [];

    // Aplicar filtro de fecha inicio si se proporciona
    if (fechaInicio) {
      const fechaInicioDate = new Date(fechaInicio);
      fechaInicioDate.setHours(0, 0, 0, 0); // Inicio del día
      whereConditions.push(gte(clientesLealtad.fechaUsuarioDigital, fechaInicioDate));
    }

    // Aplicar filtro de fecha fin si se proporciona
    if (fechaFin) {
      const fechaFinDate = new Date(fechaFin);
      fechaFinDate.setHours(23, 59, 59, 999); // Final del día
      whereConditions.push(lte(clientesLealtad.fechaUsuarioDigital, fechaFinDate));
    }

    const query = db
      .select()
      .from(clientesLealtad)
      .orderBy(desc(clientesLealtad.fechaUsuarioDigital));

    // Aplicar condiciones WHERE si existen
    if (whereConditions.length > 0) {
      return await query.where(and(...whereConditions));
    }

    return await query;
  } catch (error) {
    console.error('Error obteniendo clientes de lealtad:', error);
    throw new Error('Error al obtener los datos de clientes');
  }
}

// Servicio para obtener un cliente por ID
export async function obtenerClientePorId(id: string): Promise<ClienteLealtad | null> {
  try {
    const [cliente] = await db
      .select()
      .from(clientesLealtad)
      .where(eq(clientesLealtad.id, id))
      .limit(1);

    return cliente || null;
  } catch (error) {
    console.error('Error obteniendo cliente por ID:', error);
    throw new Error('Error al obtener el cliente');
  }
}
