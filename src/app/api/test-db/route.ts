import { NextResponse } from 'next/server';
import { testConnection } from '../../../../lib/db';

export async function GET() {
  try {
    console.log('🔍 Probando conexión a la base de datos...');
    console.log('📋 Variables de entorno:');
    console.log('  XDB_HOST:', process.env.XDB_HOST);
    console.log('  DB_DATABASE:', process.env.DB_DATABASE);
    console.log('  DB_PORT:', process.env.DB_PORT);
    console.log('  DB_USER:', process.env.DB_USER);
    console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '[CONFIGURADA]' : '[NO CONFIGURADA]');
    console.log('  ES_PRODUCCION:', process.env.ES_PRODUCCION);
    console.log('  USAR_CERTIFICADOS:', process.env.USAR_CERTIFICADOS);
    
    // Intentar múltiples configuraciones de conexión
    const { Pool } = require('pg');
    
    // Configuración 1: Sin SSL
    console.log('🔗 Prueba 1: Sin SSL...');
    try {
      const testPool1 = new Pool({
        host: process.env.XDB_HOST,
        database: process.env.DB_DATABASE,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: false,
        connectionTimeoutMillis: 5000,
      });
      
      const client1 = await testPool1.connect();
      console.log('✅ Conexión sin SSL exitosa!');
      await client1.query('SELECT NOW() as server_time');
      console.log('✅ Query sin SSL ejecutada correctamente');
      client1.release();
      testPool1.end();
    } catch (error1) {
      console.error('❌ Error sin SSL:', error1.message);
      
      // Configuración 2: Con SSL
      console.log('🔗 Prueba 2: Con SSL...');
      try {
        const testPool2 = new Pool({
          host: process.env.XDB_HOST,
          database: process.env.DB_DATABASE,
          port: parseInt(process.env.DB_PORT || '5432'),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 5000,
        });
        
        const client2 = await testPool2.connect();
        console.log('✅ Conexión con SSL exitosa!');
        await client2.query('SELECT NOW() as server_time');
        console.log('✅ Query con SSL ejecutada correctamente');
        client2.release();
        testPool2.end();
      } catch (error2) {
        console.error('❌ Error con SSL:', error2.message);
        
        // Configuración 3: SSL requerido
        console.log('🔗 Prueba 3: SSL requerido...');
        try {
          const testPool3 = new Pool({
            host: process.env.XDB_HOST,
            database: process.env.DB_DATABASE,
            port: parseInt(process.env.DB_PORT || '5432'),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl: { rejectUnauthorized: false, require: true },
            connectionTimeoutMillis: 5000,
          });
          
          const client3 = await testPool3.connect();
          console.log('✅ Conexión con SSL requerido exitosa!');
          await client3.query('SELECT NOW() as server_time');
          console.log('✅ Query con SSL requerido ejecutada correctamente');
          client3.release();
          testPool3.end();
        } catch (error3) {
          console.error('❌ Error con SSL requerido:', error3.message);
        }
      }
    }
    
    const isConnected = await testConnection();
    
    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'Conexión exitosa a la base de datos',
        config: {
          host: process.env.XDB_HOST,
          database: process.env.DB_DATABASE,
          port: process.env.DB_PORT,
          user: process.env.DB_USER,
          ssl: process.env.USAR_CERTIFICADOS === 'true'
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Error en la conexión a la base de datos',
          config: {
            host: process.env.XDB_HOST,
            database: process.env.DB_DATABASE,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            ssl: process.env.USAR_CERTIFICADOS === 'true'
          }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error en test de conexión:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error interno en la prueba de conexión',
        error: error instanceof Error ? error.message : 'Error desconocido',
        config: {
          host: process.env.XDB_HOST,
          database: process.env.DB_DATABASE,
          port: process.env.DB_PORT,
          user: process.env.DB_USER,
          ssl: process.env.USAR_CERTIFICADOS === 'true'
        }
      },
      { status: 500 }
    );
  }
}
