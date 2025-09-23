import { db } from '../db';
import { usuariosDigitalesMotivosAfiliacion } from '../schema-accounts';
import { eq } from 'drizzle-orm';

// Función para guardar o actualizar un motivo de no afiliación
export async function guardarMotivoNoAfiliacion(
  idUsuarioDigital: string,
  motivo: string
): Promise<boolean> {
  try {
    // Convertir UUID a integer si es necesario
    const idUsuarioInt = parseInt(idUsuarioDigital);
    
    // Verificar si ya existe un motivo para este usuario
    const existingMotivo = await db
      .select()
      .from(usuariosDigitalesMotivosAfiliacion)
      .where(eq(usuariosDigitalesMotivosAfiliacion.idUsuarioDigital, idUsuarioInt))
      .limit(1);

    if (existingMotivo.length > 0) {
      // Actualizar el motivo existente
      await db
        .update(usuariosDigitalesMotivosAfiliacion)
        .set({ motivoNoAfilio: motivo })
        .where(eq(usuariosDigitalesMotivosAfiliacion.idUsuarioDigital, idUsuarioInt));
      
      console.log('✅ Motivo actualizado para usuario:', idUsuarioDigital);
    } else {
      // Insertar nuevo motivo
      await db
        .insert(usuariosDigitalesMotivosAfiliacion)
        .values({
          idUsuarioDigital: idUsuarioInt,
          motivoNoAfilio: motivo
        });
      
      console.log('✅ Nuevo motivo insertado para usuario:', idUsuarioDigital);
    }

    return true;
  } catch (error) {
    console.error('❌ Error guardando motivo de no afiliación:', error);
    throw new Error('Error al guardar el motivo de no afiliación');
  }
}

// Función para obtener todos los motivos existentes
export async function obtenerMotivosNoAfiliacion(): Promise<{[key: string]: string}> {
  try {
    const motivos = await db
      .select()
      .from(usuariosDigitalesMotivosAfiliacion);

    // Convertir a objeto con ID como clave y motivo como valor
    const motivosMap: {[key: string]: string} = {};
    motivos.forEach(motivo => {
      motivosMap[motivo.idUsuarioDigital.toString()] = motivo.motivoNoAfilio;
    });

    console.log('✅ Motivos cargados:', Object.keys(motivosMap).length);
    return motivosMap;
  } catch (error) {
    console.error('❌ Error obteniendo motivos de no afiliación:', error);
    return {}; // Retornar objeto vacío en caso de error
  }
}

// Función para eliminar un motivo
export async function eliminarMotivoNoAfiliacion(idUsuarioDigital: string): Promise<boolean> {
  try {
    const idUsuarioInt = parseInt(idUsuarioDigital);
    
    await db
      .delete(usuariosDigitalesMotivosAfiliacion)
      .where(eq(usuariosDigitalesMotivosAfiliacion.idUsuarioDigital, idUsuarioInt));

    console.log('✅ Motivo eliminado para usuario:', idUsuarioDigital);
    return true;
  } catch (error) {
    console.error('❌ Error eliminando motivo:', error);
    throw new Error('Error al eliminar el motivo');
  }
}
