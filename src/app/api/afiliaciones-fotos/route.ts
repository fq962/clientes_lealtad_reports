import { NextRequest, NextResponse } from "next/server";

// Proxy a la API para reporte de fotos de afiliaciones
export async function GET(request: NextRequest) {
  const API_BASE = process.env.API_BASE_URL || "http://localhost:4040";
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");

    const params = new URLSearchParams();
    if (fechaInicio) params.append("fechaInicio", fechaInicio);
    if (fechaFin) params.append("fechaFin", fechaFin);

    const upstream = `${API_BASE}/v1/afiliamiento/reporte-afiliaciones-fotos?${params.toString()}`;

    const resp = await fetch(upstream, {
      method: "GET",
      headers: { accept: "*/*" },
      cache: "no-store",
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        {
          success: false,
          error: `Error del servicio externo: ${resp.status} ${text}`,
        },
        { status: 502 }
      );
    }

    const json = await resp.json();
    const data = Array.isArray(json?.data) ? json.data : [];

    // Normalizar campos del backend
    const normalized = data.map((item: Record<string, unknown>) => ({
      id: item.id ?? null,
      nombre_preferido: item.nombre_preferido ?? null,
      sucursal_venta: item.sucursal_venta ?? null,
      asesor_venta: item.asesor_venta ?? null,
      url_imagen_frontal: item.url_imagen_frontal ?? null,
      url_imagen_trasera: item.url_imagen_trasera ?? null,
      url_imagen_selfie: item.url_imagen_selfie ?? null,
      id_contacto: item.id_contacto ?? null,
      id_usuario_digital: item.id_usuario_digital ?? null,
      tuvo_conflicto: item.tuvo_conflicto ?? false,
    }));

    return NextResponse.json({
      success: true,
      message: json?.message ?? "OK",
      data: normalized,
      total: normalized.length,
    });
  } catch (error) {
    console.error("Error en proxy afiliaciones-fotos:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del proxy" },
      { status: 500 }
    );
  }
}
