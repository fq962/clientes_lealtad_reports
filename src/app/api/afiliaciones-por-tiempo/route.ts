import { NextRequest, NextResponse } from "next/server";
import { obtenerAfiliacionesPorTiempo } from "../../../../lib/services/afiliaciones-por-tiempo";

// Proxy a la API para reporte de afiliaciones por tiempo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");

    const data = await obtenerAfiliacionesPorTiempo(
      fechaInicio || undefined,
      fechaFin || undefined
    );

    return NextResponse.json({
      success: true,
      message: "Reporte de afiliaciones por tiempo obtenido exitosamente",
      data,
      total: data.length,
    });
  } catch (error) {
    console.error("Error en proxy afiliaciones-por-tiempo:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}


