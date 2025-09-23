import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Probando query específica...');
    
    const { Pool } = await import('pg');
    const testPool = new Pool({
      host: process.env.XDB_HOST,
      database: process.env.DB_DATABASE,
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: false,
      connectionTimeoutMillis: 5000,
    });
    
    const client = await testPool.connect();
    console.log('✅ Conexión establecida');
    
    // Verificar si existe el schema accounts
    console.log('🔍 Verificando schema accounts...');
    const schemaCheck = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'accounts'
    `);
    console.log('Schemas encontrados:', schemaCheck.rows);
    
    // Verificar todas las tablas en accounts
    console.log('🔍 Verificando tablas en accounts...');
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'accounts'
      ORDER BY table_name
    `);
    console.log('Tablas en accounts:', tablesCheck.rows);
    
    // Verificar tabla usuarios_digitales específicamente
    console.log('🔍 Verificando usuarios_digitales...');
    const usuariosTable = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'accounts' 
      AND table_name = 'usuarios_digitales'
      ORDER BY ordinal_position
    `);
    console.log('Columnas en usuarios_digitales:', usuariosTable.rows);
    
    // Probar query simple
    console.log('🔍 Probando query simple...');
    try {
      const simpleQuery = await client.query(`
        SELECT COUNT(*) as total 
        FROM accounts.usuarios_digitales 
        LIMIT 1
      `);
      console.log('✅ Query simple exitosa:', simpleQuery.rows);
    } catch (queryError) {
      console.error('❌ Error en query simple:', queryError instanceof Error ? queryError.message : queryError);
    }
    
    // Probar query completa (sin Drizzle)
    console.log('🔍 Probando query completa...');
    try {
      const fullQuery = await client.query(`
        SELECT
          usuario_digital.fecha_creacion AS "fechaUsuarioDigital",
          usuario_digital.ultimo_inicio_sesion AS "ultimoInicioSesionApp",
          usuario_digital.id_usuario_digital AS "idUsuarioDigital",
          usuario_digital.nombre_preferido AS "nombrePreferido",
          contact.nombre_completo AS "nombreCompletoContacto",
          contact.identificacion AS "identificacion",
          contact.identificacion_tipo_dato AS "tipoIdentificacion",
          usuario_digital.id_contacto AS "idContacto",
          email.email AS "correoApp",
          usuario_digital.email_validado AS "emailValidado",
          proveedor_auth.proveedor AS "metodoAuth",
          phone.telefono AS "telefonoApp",
          usuario_digital.telefono_validado AS "telefonoValidado",
          usuario_digital.foto_perfil AS "fotoPerfilApp"
        FROM accounts.usuarios_digitales usuario_digital
        LEFT JOIN accounts.emails email ON usuario_digital.id_email = email.id_email
        LEFT JOIN accounts.phone_numbers phone ON usuario_digital.id_telefono = phone.id_telefono
        LEFT JOIN accounts.contacts contact ON usuario_digital.id_contacto = contact.id_contacto
        LEFT JOIN accounts.usuarios_digitales_credenciales usuario_credencial ON usuario_digital.id_usuario_digital = usuario_credencial.id_usuario_digital
        LEFT JOIN accounts.proveedores_autenticacion proveedor_auth ON usuario_credencial.id_proveedor = proveedor_auth.id_proveedor
        WHERE usuario_digital.fecha_creacion::DATE = CURRENT_DATE
        ORDER BY usuario_digital.fecha_creacion, usuario_digital.nombre_preferido
        LIMIT 5
      `);
      console.log('✅ Query completa exitosa, registros:', fullQuery.rows.length);
      console.log('Primer registro:', fullQuery.rows[0]);
    } catch (fullQueryError) {
      console.error('❌ Error en query completa:', fullQueryError instanceof Error ? fullQueryError.message : fullQueryError);
    }
    
    client.release();
    testPool.end();
    
    return NextResponse.json({
      success: true,
      message: 'Diagnóstico completado, revisa los logs del servidor'
    });
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
