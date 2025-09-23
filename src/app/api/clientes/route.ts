import { NextRequest, NextResponse } from 'next/server';
import { obtenerClientesLealtad } from '../../../../lib/services/clientes';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    const clientes = await obtenerClientesLealtad(
      fechaInicio || undefined,
      fechaFin || undefined
    );

    return NextResponse.json({
      success: true,
      data: clientes,
      total: clientes.length
    });
  } catch (error) {
    console.error('Error en API de clientes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}
