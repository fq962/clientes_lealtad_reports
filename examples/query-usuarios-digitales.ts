// Ejemplo de cómo usar la consulta de usuarios digitales con Drizzle
import { obtenerUsuariosDigitalesCompletos, obtenerUsuariosPorFecha } from '../lib/services/usuarios-digitales';

// Ejemplo 1: Obtener usuarios de una fecha específica (equivalente a tu query original)
async function ejemploFechaEspecifica() {
  try {
    const usuarios = await obtenerUsuariosPorFecha('2025-09-23');
    console.log('Usuarios del 23 de septiembre 2025:', usuarios);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Ejemplo 2: Obtener usuarios de un rango de fechas
async function ejemploRangoFechas() {
  try {
    const usuarios = await obtenerUsuariosDigitalesCompletos('2025-09-20', '2025-09-25');
    console.log('Usuarios del 20 al 25 de septiembre:', usuarios);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Ejemplo 3: Obtener todos los usuarios (sin filtro de fecha)
async function ejemploTodosUsuarios() {
  try {
    const usuarios = await obtenerUsuariosDigitalesCompletos();
    console.log('Todos los usuarios:', usuarios);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Ejemplo 4: Usar la API REST
async function ejemploAPI() {
  try {
    // Para fecha específica
    const response1 = await fetch('/api/usuarios-digitales?fechaInicio=2025-09-23&fechaFin=2025-09-23');
    const data1 = await response1.json();
    console.log('Usuarios desde API (fecha específica):', data1);

    // Para rango de fechas
    const response2 = await fetch('/api/usuarios-digitales?fechaInicio=2025-09-20&fechaFin=2025-09-25');
    const data2 = await response2.json();
    console.log('Usuarios desde API (rango):', data2);
  } catch (error) {
    console.error('Error en API:', error);
  }
}

export { 
  ejemploFechaEspecifica, 
  ejemploRangoFechas, 
  ejemploTodosUsuarios, 
  ejemploAPI 
};
