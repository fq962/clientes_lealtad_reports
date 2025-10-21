import { NextRequest, NextResponse } from "next/server";

type ExternalItem = {
  id?: string | number | null;
  idUsuarioDigital?: string | number | null;
  idTipoEvento?: string | number | null;
  tipoEvento?: string | null;
  ocrIdentificacion?: unknown;
  analisisSimilitud?: unknown;
  urlImagenFrontal?: string | null;
  urlImagenTrasera?: string | null;
  urlSelfie?: string | null;
  fechaRegistro?: string | null;
  motivoReintento?: string | null;
  tipoMotivoReintento?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const fechaInicio = url.searchParams.get("fechaInicio");
    const fechaFin = url.searchParams.get("fechaFin");

    const params = new URLSearchParams();
    if (fechaInicio) params.set("fechaInicio", fechaInicio);
    if (fechaFin) params.set("fechaFin", fechaFin);

    const upstream = `http://localhost:4040/v1/afiliamiento/log-reintentos-afiliacion-reporte?${params.toString()}`;

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
    const list: ExternalItem[] = Array.isArray(json?.data) ? json.data : [];

    const data = list.map((i) => ({
      id: i?.id ?? null,
      id_usuario_digital: i?.idUsuarioDigital ?? null,
      id_tipo_evento: i?.idTipoEvento ?? null,
      tipo_evento: (i?.tipoEvento as string | null) ?? null,
      ocr_identificacion: i?.ocrIdentificacion ?? null,
      analisis_similitud: i?.analisisSimilitud ?? null,
      imagen_frontal: i?.urlImagenFrontal ?? null,
      imagen_trasera: i?.urlImagenTrasera ?? null,
      selfie: i?.urlSelfie ?? null,
      // Normalizamos a formato compatible con Date del navegador (reemplazar espacio por 'T')
      fecha_registro:
        typeof i?.fechaRegistro === "string"
          ? (i?.fechaRegistro as string).replace(" ", "T")
          : null,
      motivo_reintento: (i?.motivoReintento as string | null) ?? null,
      tipo_motivo_reintento: (i?.tipoMotivoReintento as string | null) ?? null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: "Error interno" },
      { status: 500 }
    );
  }
}
