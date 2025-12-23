// Tipo para los datos del reporte de afiliaciones por tiempo
export interface AfiliacionPorTiempo {
  id_usuario_digital: number;
  nombre_preferido: string;
  fecha_creacion: string;
  id_intento: string;
  tiempo_transcurrido: string;
  un_intento: number;
  mas_de_una_correccion: number;
}

// Tipo para la respuesta del endpoint
export interface AfiliacionesPorTiempoResponse {
  success: boolean;
  message: string;
  data: AfiliacionPorTiempo[];
}

// Servicio para obtener el reporte de afiliaciones por tiempo
export async function obtenerAfiliacionesPorTiempo(
  fechaInicio?: string,
  fechaFin?: string
): Promise<AfiliacionPorTiempo[]> {
  try {
    const API_BASE = process.env.API_BASE_URL || "http://localhost:4040";

    const params = new URLSearchParams();
    if (fechaInicio) params.append("fechaInicio", fechaInicio);
    if (fechaFin) params.append("fechaFin", fechaFin);

    const url = `${API_BASE}/v1/afiliamiento/reporte-afiliaciones-por-tiempo?${params.toString()}`;

    const resp = await fetch(url, {
      method: "GET",
      headers: { accept: "*/*" },
      cache: "no-store",
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`Error del servicio externo: ${resp.status} ${text}`);
      throw new Error(`Error del servicio externo: ${resp.status} ${text}`);
    }

    const json: AfiliacionesPorTiempoResponse = await resp.json();

    if (!json.success) {
      throw new Error(json.message || "Error al obtener el reporte");
    }

    return Array.isArray(json.data) ? json.data : [];
  } catch (error) {
    console.error("Error obteniendo afiliaciones por tiempo:", error);
    throw new Error("Error al obtener el reporte de afiliaciones por tiempo");
  }
}
