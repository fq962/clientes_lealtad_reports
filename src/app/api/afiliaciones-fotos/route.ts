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
    const rawData = Array.isArray(json?.data) ? json.data : [];

    // Ordenar por id_usuario_digital de menor a mayor
    const data = rawData.sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) => {
        const idA = Number(a.id_usuario_digital) || 0;
        const idB = Number(b.id_usuario_digital) || 0;
        return idA - idB;
      }
    );

    // Retornar los datos tal como vienen del API
    const normalized = data;

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
