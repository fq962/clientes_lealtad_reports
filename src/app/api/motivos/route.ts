import { NextRequest, NextResponse } from "next/server";
import { obtenerMotivosNoAfiliacion } from "../../../../lib/services/motivos-afiliacion";

// GET - Obtener todos los motivos
export async function GET() {
  try {
    const motivos = await obtenerMotivosNoAfiliacion();

    return NextResponse.json({
      success: true,
      data: motivos,
    });
  } catch (error) {
    console.error("Error en API de motivos (GET):", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener los motivos",
      },
      { status: 500 }
    );
  }
}

// POST - Guardar un motivo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idFromBody = body?.idUsuarioDigital;
    // La UI envía "motivo"; tu API espera "motivoNoAfiliacion"
    const motivo = body?.motivo ?? body?.motivoNoAfiliacion;

    if (idFromBody === undefined || idFromBody === null || !motivo) {
      return NextResponse.json(
        {
          success: false,
          error: "ID de usuario y motivo son requeridos",
        },
        { status: 400 }
      );
    }

    const idUsuarioDigitalNum = Number(idFromBody);
    if (Number.isNaN(idUsuarioDigitalNum)) {
      return NextResponse.json(
        { success: false, error: "El idUsuarioDigital debe ser numérico" },
        { status: 400 }
      );
    }

    const resp = await fetch(
      "https://api.allasrepuestos.com/v1/afiliamiento/insertar-motivo-no-afiliacion",
      {
        method: "POST",
        headers: {
          accept: "*/*",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          idUsuarioDigital: idUsuarioDigitalNum,
          motivoNoAfiliacion: String(motivo),
        }),
      }
    );

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
    // Devuelve tal cual pero garantizando success boolean
    return NextResponse.json({
      success: Boolean(json?.success ?? true),
      message: json?.message ?? "Motivo actualizado exitosamente",
      data: json?.data ?? true,
    });
  } catch (error) {
    console.error("Error en API de motivos (POST):", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
