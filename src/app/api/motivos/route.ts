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
    const motivoNoAfiliacion = body?.motivoNoAfiliacion ?? body?.motivo ?? null;
    const motivoNoAfiliacionAsesor = body?.motivoNoAfiliacionAsesor ?? null;
    const tipoMotivoReintento =
      body?.tipoMotivoReintento !== undefined ? body.tipoMotivoReintento : null;

    const hasAlguno =
      (typeof motivoNoAfiliacion === "string" &&
        motivoNoAfiliacion.trim() !== "") ||
      (typeof motivoNoAfiliacionAsesor === "string" &&
        motivoNoAfiliacionAsesor.trim() !== "");

    if (idFromBody === undefined || idFromBody === null || !hasAlguno) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ID de usuario y al menos uno de los motivos (IT o Asesor) son requeridos",
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

    const API_BASE = process.env.API_BASE_URL || "http://localhost:4040";
    const resp = await fetch(
      `${API_BASE}/v1/afiliamiento/insertar-motivo-no-afiliacion`,
      {
        method: "POST",
        headers: {
          accept: "*/*",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          idUsuarioDigital: idUsuarioDigitalNum,
          motivoNoAfiliacion:
            typeof motivoNoAfiliacion === "string" &&
            motivoNoAfiliacion.trim() !== ""
              ? motivoNoAfiliacion
              : null,
          motivoNoAfiliacionAsesor:
            typeof motivoNoAfiliacionAsesor === "string" &&
            motivoNoAfiliacionAsesor.trim() !== ""
              ? motivoNoAfiliacionAsesor
              : null,
          tipoMotivoReintento: tipoMotivoReintento ?? null,
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
