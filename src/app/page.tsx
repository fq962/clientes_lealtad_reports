'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  // Función para obtener la fecha de hoy en formato YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Estados para el filtro de fechas (por defecto hoy a hoy)
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  
  // Estados para los datos y carga
  const [clientes, setClientes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para ordenamiento
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Estados para el modal de motivo de no afiliación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [motivoNoAfiliacion, setMotivoNoAfiliacion] = useState('');
  
  // Estado para almacenar los motivos de no afiliación
  const [motivosNoAfiliacion, setMotivosNoAfiliacion] = useState<{[key: string]: string}>({});

  // Datos de ejemplo para la tabla
  const sampleData = [
    {
      fechaUsuarioDigital: getTodayDate(),
      idUsuarioDigital: "UD001",
      nombrePreferido: "María",
      idContacto: "CT001",
      nombreCompletoContacto: "María García López",
      identificacion: "12345678",
      tipoIdentificacion: "Cédula",
      correoApp: "maria.garcia@email.com",
      telefonoApp: "+57 300 123 4567",
      fotoPerfilApp: "/avatar1.jpg"
    },
    {
      fechaUsuarioDigital: getTodayDate(),
      idUsuarioDigital: "UD002",
      nombrePreferido: "Carlos",
      idContacto: "CT002",
      nombreCompletoContacto: "Carlos Andrés Rodríguez",
      identificacion: "87654321",
      tipoIdentificacion: "Cédula",
      correoApp: "carlos.rodriguez@email.com",
      telefonoApp: "+57 301 987 6543",
      fotoPerfilApp: "/avatar2.jpg"
    },
    {
      fechaUsuarioDigital: "2024-01-15",
      idUsuarioDigital: "UD003",
      nombrePreferido: "Ana",
      idContacto: "CT003",
      nombreCompletoContacto: "Ana Sofía Martínez",
      identificacion: "11223344",
      tipoIdentificacion: "Cédula",
      correoApp: "ana.martinez@email.com",
      telefonoApp: "+57 302 555 7890",
      fotoPerfilApp: "/avatar3.jpg"
    },
    {
      fechaUsuarioDigital: "2024-01-16",
      idUsuarioDigital: "UD002",
      nombrePreferido: "Carlos",
      idContacto: "CT002",
      nombreCompletoContacto: "Carlos Andrés Rodríguez",
      identificacion: "87654321",
      tipoIdentificacion: "Cédula",
      correoApp: "carlos.rodriguez@email.com",
      telefonoApp: "+57 301 987 6543",
      fotoPerfilApp: "/avatar2.jpg"
    },
    {
      fechaUsuarioDigital: "2024-01-17",
      idUsuarioDigital: "UD003",
      nombrePreferido: "Ana",
      idContacto: "CT003",
      nombreCompletoContacto: "Ana Sofía Martínez",
      identificacion: "11223344",
      tipoIdentificacion: "Cédula",
      correoApp: "ana.martinez@email.com",
      telefonoApp: "+57 302 555 7890",
      fotoPerfilApp: "/avatar3.jpg"
    },
    {
      fechaUsuarioDigital: "2024-02-01",
      idUsuarioDigital: "UD004",
      nombrePreferido: "Luis",
      idContacto: "CT004",
      nombreCompletoContacto: "Luis Fernando Torres",
      identificacion: "55667788",
      tipoIdentificacion: "Cédula",
      correoApp: "luis.torres@email.com",
      telefonoApp: "+57 303 444 5555",
      fotoPerfilApp: "/avatar4.jpg"
    },
    {
      fechaUsuarioDigital: "2024-02-15",
      idUsuarioDigital: "UD005",
      nombrePreferido: "Elena",
      idContacto: "CT005",
      nombreCompletoContacto: "Elena Patricia Morales",
      identificacion: "99887766",
      tipoIdentificacion: "Cédula",
      correoApp: "elena.morales@email.com",
      telefonoApp: "+57 304 666 7777",
      fotoPerfilApp: "/avatar5.jpg"
    }
  ];

  // Función para cargar motivos desde la base de datos
  const fetchMotivos = async () => {
    try {
      const response = await fetch('/api/motivos');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMotivosNoAfiliacion(data.data);
        }
      }
    } catch (error) {
      console.error('Error cargando motivos:', error);
    }
  };

  // Función para obtener datos de la API
  const fetchClientes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (startDate) params.append('fechaInicio', startDate);
      if (endDate) params.append('fechaFin', endDate);
      
      // Cargar datos de usuarios y motivos en paralelo
      const [usuariosResponse] = await Promise.all([
        fetch(`/api/usuarios-digitales?${params.toString()}`),
        fetchMotivos() // Cargar motivos cada vez que se cargan usuarios
      ]);
      
      if (!usuariosResponse.ok) {
        throw new Error('Error al obtener los datos');
      }
      
      const data = await usuariosResponse.json();
      
      if (data.success) {
        // Formatear datos para que coincidan con el formato esperado
        const clientesFormateados = data.data.map((usuario: any) => ({
          fechaUsuarioDigital: usuario.fechaUsuarioDigital ? 
            new Date(usuario.fechaUsuarioDigital).toLocaleString('es-HN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'America/Tegucigalpa'
            }) : '',
          ultimoInicioSesionApp: usuario.ultimoInicioSesionApp ? 
            new Date(usuario.ultimoInicioSesionApp).toLocaleString('es-HN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'America/Tegucigalpa'
            }) : '',
          idUsuarioDigital: usuario.idUsuarioDigital,
          nombrePreferido: usuario.nombrePreferido,
          nombreCompletoContacto: usuario.nombreCompletoContacto,
          identificacion: usuario.identificacion,
          tipoIdentificacion: usuario.tipoIdentificacion,
          idContacto: usuario.idContacto,
          correoApp: usuario.correoApp,
          emailValidado: usuario.emailValidado,
          metodoAuth: usuario.metodoAuth,
          telefonoApp: usuario.telefonoApp,
          telefonoValidado: usuario.telefonoValidado,
          fotoPerfilApp: usuario.fotoPerfilApp
        }));
        setClientes(clientesFormateados);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error fetching clientes:', error);
      setError('Error al cargar los datos. Usando datos de ejemplo.');
      // En caso de error, usar datos de ejemplo
      setClientes([
        {
          fechaUsuarioDigital: new Date().toLocaleString('es-HN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Tegucigalpa'
          }),
          ultimoInicioSesionApp: new Date().toLocaleString('es-HN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Tegucigalpa'
          }),
          idUsuarioDigital: "UD001",
          nombrePreferido: "María",
          nombreCompletoContacto: "María García López",
          identificacion: "12345678",
          tipoIdentificacion: "Cédula",
          idContacto: "CT001",
          correoApp: "maria.garcia@email.com",
          emailValidado: true,
          metodoAuth: "Email",
          telefonoApp: "+57 300 123 4567",
          telefonoValidado: true,
          fotoPerfilApp: "/avatar1.jpg"
        },
        {
          fechaUsuarioDigital: new Date(Date.now() - 60000).toLocaleString('es-HN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Tegucigalpa'
          }),
          ultimoInicioSesionApp: new Date(Date.now() - 120000).toLocaleString('es-HN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Tegucigalpa'
          }),
          idUsuarioDigital: "UD002",
          nombrePreferido: "Carlos",
          nombreCompletoContacto: "Carlos Andrés Rodríguez",
          identificacion: "87654321",
          tipoIdentificacion: "Cédula",
          idContacto: null, // Sin contacto para demostrar funcionalidad
          correoApp: "carlos.rodriguez@email.com",
          emailValidado: false,
          metodoAuth: "Google",
          telefonoApp: "+57 301 987 6543",
          telefonoValidado: true,
          fotoPerfilApp: "/avatar2.jpg"
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Efecto para cargar datos iniciales y cuando cambien las fechas
  useEffect(() => {
    fetchClientes();
  }, [startDate, endDate]);

  // Efecto para cargar motivos al inicializar la aplicación
  useEffect(() => {
    fetchMotivos();
  }, []);

  // Efecto para manejar la tecla Escape para cerrar el modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isModalOpen]);

  // Función para limpiar filtros (restablece a hoy y fuerza nueva consulta)
  const clearFilters = () => {
    const today = getTodayDate();
    setStartDate(today);
    setEndDate(today);
    
    // Mostrar indicador de carga y forzar nueva consulta
    setIsLoading(true);
    console.log('🔄 Forzando actualización de datos para hoy...');
    
    // Forzar nueva consulta inmediatamente
    setTimeout(() => {
      fetchClientes();
    }, 100);
  };

  // Función para manejar el ordenamiento
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Si es la misma columna, cambiar dirección
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Si es una nueva columna, establecer ASC por defecto
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Función para obtener datos ordenados
  const getSortedData = () => {
    if (!sortColumn) return clientes;

    return [...clientes].sort((a, b) => {
      let valueA = a[sortColumn];
      let valueB = b[sortColumn];

      // Manejar valores nulos
      if (valueA === null || valueA === undefined) valueA = '';
      if (valueB === null || valueB === undefined) valueB = '';

      // Convertir a string para comparación
      const strA = String(valueA).toLowerCase();
      const strB = String(valueB).toLowerCase();

      // Ordenamiento para fechas (ahora con hora incluida)
      if (sortColumn === 'fechaUsuarioDigital') {
        // Convertir formato español a Date
        const parseSpanishDate = (dateStr: string) => {
          if (!dateStr) return new Date('1900-01-01');
          // Formato: DD/MM/YYYY, HH:mm
          const [datePart, timePart] = dateStr.split(', ');
          const [day, month, year] = datePart.split('/');
          const [hour, minute] = timePart ? timePart.split(':') : ['00', '00'];
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        };
        
        const dateA = parseSpanishDate(valueA);
        const dateB = parseSpanishDate(valueB);
        return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      }

      // Ordenamiento alfanumérico para el resto
      if (strA < strB) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (strA > strB) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Función para contar registros sin contacto
  const getContactStats = () => {
    const withoutContact = clientes.filter(row => !row.idContacto || row.idContacto === null || row.idContacto === '').length;
    const withContact = clientes.length - withoutContact;
    return { withContact, withoutContact };
  };

  // Funciones para el modal
  const handleRowDoubleClick = (user: any) => {
    setSelectedUser(user);
    // Si ya existe un motivo, pre-llenarlo en el textarea
    const existingMotivo = motivosNoAfiliacion[user.idUsuarioDigital] || '';
    setMotivoNoAfiliacion(existingMotivo);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setMotivoNoAfiliacion('');
  };

  const handleSaveMotivo = async () => {
    if (motivoNoAfiliacion.trim()) {
      const userId = selectedUser?.idUsuarioDigital;
      if (userId) {
        try {
          // Intentar guardar en la base de datos
          const response = await fetch('/api/motivos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              idUsuarioDigital: userId,
              motivo: motivoNoAfiliacion.trim()
            }),
          });

          const result = await response.json();

          if (result.success) {
            // Actualizar el estado local también
            setMotivosNoAfiliacion(prev => ({
              ...prev,
              [userId]: motivoNoAfiliacion.trim()
            }));
            
            console.log('✅ Motivo guardado en BD para usuario:', userId);
            alert(`✅ Motivo guardado en BD para ${selectedUser?.nombrePreferido || selectedUser?.idUsuarioDigital}`);
            
            handleCloseModal();
          } else {
            throw new Error(result.error || 'Error al guardar');
          }
        } catch (error) {
          console.error('❌ Error guardando en BD, usando estado local:', error);
          
          // Si falla la BD, guardar solo en estado local
          setMotivosNoAfiliacion(prev => ({
            ...prev,
            [userId]: motivoNoAfiliacion.trim()
          }));
          
          alert(`⚠️ Motivo guardado localmente para ${selectedUser?.nombrePreferido || selectedUser?.idUsuarioDigital}\n(No se pudo guardar en BD - verificar permisos)`);
          
          handleCloseModal();
        }
      }
    } else {
      alert('Por favor ingresa un motivo de no afiliación');
    }
  };

  // Componente para el icono de ordenamiento
  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    if (sortDirection === 'asc') {
      return (
        <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Reportes de Lealtad de Clientes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestión y seguimiento de usuarios digitales y contactos
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha Inicio
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha Fin
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors"
                title="Restablecer a hoy y actualizar datos"
              >
                🔄 Hoy
              </button>
              <div className="flex gap-2 flex-wrap">
                <div className="px-4 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800">
                  {isLoading ? 'Cargando...' : `${clientes.length} resultado${clientes.length !== 1 ? 's' : ''}`}
                </div>
                {!isLoading && clientes.length > 0 && (
                  <div className="px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md border border-red-200 dark:border-red-800">
                    Sin Contacto: {getContactStats().withoutContact}
                  </div>
                )}
                {sortColumn && (
                  <div className="px-3 py-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md border border-green-200 dark:border-green-800">
                    Ordenado: {sortColumn.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} ({sortDirection.toUpperCase()})
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 dark:text-yellow-200">{error}</p>
          </div>
        )}

        {/* Tabla responsiva */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {/* 1. Fecha Usuario Digital - 160px */}
                  <th className="w-40 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('fechaUsuarioDigital')}
                      className="flex items-center hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                    >
                      Fecha Usuario Digital
                      <SortIcon column="fechaUsuarioDigital" />
                    </button>
                  </th>
                  {/* 2. Id Usuario Digital - 120px */}
                  <th className="w-30 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('idUsuarioDigital')}
                      className="flex items-center hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                    >
                      Id Usuario Digital
                      <SortIcon column="idUsuarioDigital" />
                    </button>
                  </th>
                  {/* 3. Nombre Preferido - 140px */}
                  <th className="w-36 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('nombrePreferido')}
                      className="flex items-center hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                    >
                      Nombre Preferido
                      <SortIcon column="nombrePreferido" />
                    </button>
                  </th>
                  {/* 4. Id Contacto - 120px */}
                  <th className="w-30 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('idContacto')}
                      className="flex items-center hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                    >
                      Id Contacto
                      <SortIcon column="idContacto" />
                    </button>
                  </th>
                  {/* 5. Correo App - 20% */}
                  <th className="w-[20%] px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('correoApp')}
                      className="flex items-center hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                    >
                      Correo App
                      <SortIcon column="correoApp" />
                    </button>
                  </th>
                  {/* 6. Teléfono App - 15% */}
                  <th className="w-[15%] px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('telefonoApp')}
                      className="flex items-center hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                    >
                      Teléfono App
                      <SortIcon column="telefonoApp" />
                    </button>
                  </th>
                  {/* 7. Motivo No Afiliación - 200px */}
                  <th className="w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Motivo No Afiliación
                  </th>
                  {/* 8. Nombre Completo Contacto - 25% */}
                  <th className="w-[25%] px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('nombreCompletoContacto')}
                      className="flex items-center hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                    >
                      Nombre Completo Contacto
                      <SortIcon column="nombreCompletoContacto" />
                    </button>
                  </th>
                  {/* 9. Identificación - 12% */}
                  <th className="w-[12%] px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('identificacion')}
                      className="flex items-center hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                    >
                      Identificación
                      <SortIcon column="identificacion" />
                    </button>
                  </th>
                  {/* 10. Tipo Identificación - 10% */}
                  <th className="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('tipoIdentificacion')}
                      className="flex items-center hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                    >
                      Tipo Identificación
                      <SortIcon column="tipoIdentificacion" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3">Cargando datos...</span>
                      </div>
                    </td>
                  </tr>
                ) : clientes.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No se encontraron registros para el rango de fechas seleccionado
                    </td>
                  </tr>
                ) : (
                  getSortedData().map((row, index) => {
                    const isContactNull = !row.idContacto || row.idContacto === null || row.idContacto === '';
                    return (
                  <tr 
                    key={index} 
                    className={`transition-colors cursor-pointer ${
                      isContactNull 
                        ? 'bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 border-l-4 border-red-500' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onDoubleClick={() => handleRowDoubleClick(row)}
                    title="Doble clic para agregar motivo de no afiliación"
                  >
                    {/* 1. Fecha Usuario Digital - 160px */}
                    <td className="w-40 px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                      <div className="font-mono text-xs leading-tight">
                        {row.fechaUsuarioDigital}
                      </div>
                    </td>
                    {/* 2. Id Usuario Digital - 120px */}
                    <td className="w-30 px-3 py-3 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                      <div className="truncate text-xs">{row.idUsuarioDigital}</div>
                    </td>
                    {/* 3. Nombre Preferido - 140px */}
                    <td className="w-36 px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                      <div className="truncate text-xs font-medium">{row.nombrePreferido || '-'}</div>
                    </td>
                    {/* 4. Id Contacto - 120px */}
                    <td className="w-30 px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {row.idContacto ? (
                        <div className="truncate text-xs text-gray-900 dark:text-gray-100">{row.idContacto}</div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          SIN CONTACTO
                        </span>
                      )}
                    </td>
                    {/* 5. Correo App - 20% */}
                    <td className="w-[20%] px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {row.correoApp ? (
                        <a href={`mailto:${row.correoApp}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs truncate block" title={row.correoApp}>
                          {row.correoApp}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    {/* 6. Teléfono App - 15% */}
                    <td className="w-[15%] px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {row.telefonoApp ? (
                        <a href={`tel:${row.telefonoApp}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-mono truncate block">
                          {row.telefonoApp}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    {/* 7. Motivo No Afiliación - 200px */}
                    <td className="w-48 px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {motivosNoAfiliacion[row.idUsuarioDigital] ? (
                        <p className="text-xs text-gray-800 dark:text-gray-200 truncate leading-relaxed" title={motivosNoAfiliacion[row.idUsuarioDigital]}>
                          {motivosNoAfiliacion[row.idUsuarioDigital]}
                        </p>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-xs italic">
                          Sin motivo registrado
                        </span>
                      )}
                    </td>
                    {/* 8. Nombre Completo Contacto - 25% */}
                    <td className="w-[25%] px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                      <div className="truncate text-xs" title={row.nombreCompletoContacto || ''}>
                        {row.nombreCompletoContacto || '-'}
                      </div>
                    </td>
                    {/* 9. Identificación - 12% */}
                    <td className="w-[12%] px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                      <div className="text-xs font-mono truncate">{row.identificacion || '-'}</div>
                    </td>
                    {/* 10. Tipo Identificación - 10% */}
                    <td className="w-[10%] px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {row.tipoIdentificacion ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {row.tipoIdentificacion}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer con información adicional */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600 dark:text-gray-400">
          <div>
            {isLoading ? (
              'Cargando...'
            ) : (
              <>
                Mostrando {clientes.length} registros
                {(startDate || endDate) && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    (filtrado{startDate && ` desde ${startDate}`}{endDate && ` hasta ${endDate}`})
                  </span>
                )}
              </>
            )}
          </div>
          <div className="mt-2 sm:mt-0">
            Última actualización: {new Date().toLocaleString('es-ES')}
          </div>
        </div>

        {/* Modal para Motivo de No Afiliación */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
              {/* Header del Modal */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Motivo de No Afiliación
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Información del Usuario */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Usuario:</span> {selectedUser?.nombrePreferido || 'Sin nombre'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">ID:</span> {selectedUser?.idUsuarioDigital}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Email:</span> {selectedUser?.correoApp || 'Sin email'}
                  </p>
                  {!selectedUser?.idContacto && (
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      ⚠️ Usuario sin contacto asignado
                    </p>
                  )}
                  {motivosNoAfiliacion[selectedUser?.idUsuarioDigital] && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                      📝 Motivo previamente registrado (editando)
                    </p>
                  )}
                </div>
              </div>

              {/* Formulario */}
              <div className="p-6">
                <div className="mb-4">
                  <label 
                    htmlFor="motivoNoAfiliacion" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Motivo de No Afiliación *
                  </label>
                  <textarea
                    id="motivoNoAfiliacion"
                    rows={4}
                    value={motivoNoAfiliacion}
                    onChange={(e) => setMotivoNoAfiliacion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                    placeholder="Describe el motivo por el cual este usuario no se puede afiliar..."
                    autoFocus
                  />
                </div>

                {/* Botones */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveMotivo}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    Guardar Motivo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
