import { NextRequest, NextResponse } from "next/server";

// Proxy a la API para reporte de métricas de intentos nuevos
export async function GET(request: NextRequest) {
  const API_BASE = process.env.API_BASE_URL || "http://localhost:4040";
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");

    const params = new URLSearchParams();
    if (fechaInicio) params.append("fechaInicio", fechaInicio);
    if (fechaFin) params.append("fechaFin", fechaFin);

    const upstream = `${API_BASE}/v1/afiliamiento/metricas-intentos-nuevo?${params.toString()}`;

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

    return NextResponse.json({
      success: true,
      message: json?.message ?? "OK",
      data,
      total: data.length,
    });
  } catch (error) {
    console.error("Error en proxy metricas-intentos-nuevo:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del proxy" },
      { status: 500 }
    );
  }
}
