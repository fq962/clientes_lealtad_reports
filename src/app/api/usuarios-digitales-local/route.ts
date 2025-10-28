import { NextRequest, NextResponse } from "next/server";

// Proxy a la API local de afiliamiento
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");

    const params = new URLSearchParams();
    if (fechaInicio) params.append("fechaInicio", fechaInicio);
    if (fechaFin) params.append("fechaFin", fechaFin);

    const url = `http://localhost:4040/v1/afiliamiento/usuarios-digitales-reporte?${params.toString()}`;

    const resp = await fetch(url, {
      method: "GET",
      headers: { accept: "*/*" },
      // Evita caché en proxy
      cache: "no-store",
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        {
          success: false,
          error: `Error del servicio local: ${resp.status} ${text}`,
        },
        { status: 502 }
      );
    }

    const json = await resp.json();

    // Normalizar la respuesta a un formato estable (success, data, total)
    const data = Array.isArray(json?.data) ? json.data : [];
    return NextResponse.json({ success: true, data, total: data.length });
  } catch (error) {
    console.error("Error en proxy usuarios-digitales-local:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del proxy" },
      { status: 500 }
    );
  }
}
