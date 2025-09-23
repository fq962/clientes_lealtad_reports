import { NextRequest, NextResponse } from 'next/server';
import { obtenerUsuariosDigitalesCompletos } from '../../../../lib/services/usuarios-digitales';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    const usuarios = await obtenerUsuariosDigitalesCompletos(
      fechaInicio || undefined,
      fechaFin || undefined
    );

    return NextResponse.json({
      success: true,
      data: usuarios,
      total: usuarios.length
    });
  } catch (error) {
    console.error('Error en API de usuarios digitales:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}
