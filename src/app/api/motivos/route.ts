import { NextRequest, NextResponse } from 'next/server';
import { guardarMotivoNoAfiliacion, obtenerMotivosNoAfiliacion } from '../../../../lib/services/motivos-afiliacion';

// GET - Obtener todos los motivos
export async function GET() {
  try {
    const motivos = await obtenerMotivosNoAfiliacion();
    
    return NextResponse.json({
      success: true,
      data: motivos
    });
  } catch (error) {
    console.error('Error en API de motivos (GET):', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener los motivos' 
      },
      { status: 500 }
    );
  }
}

// POST - Guardar un motivo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idUsuarioDigital, motivo } = body;

    if (!idUsuarioDigital || !motivo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID de usuario y motivo son requeridos' 
        },
        { status: 400 }
      );
    }

    const success = await guardarMotivoNoAfiliacion(idUsuarioDigital, motivo);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Motivo guardado correctamente'
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error al guardar el motivo' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error en API de motivos (POST):', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}
