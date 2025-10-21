"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  UsuarioDigitalUI,
  UsuarioDigitalFromAPI,
  APIResponse,
} from "../../types/usuario";
import ReporteReintentos from "./components/ReporteReintentos";

export default function Home() {
  // Función para obtener la fecha de hoy en formato YYYY-MM-DD
  const getTodayDate = () => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Tegucigalpa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  };
  // Formateador: trata cadenas ISO con 'Z' como hora local de Honduras
  const formatHondurasDate = (value: string | Date | null) => {
    if (!value) return "";
    const inputStr = typeof value === "string" ? value : value.toISOString();
    const normalized = inputStr.endsWith("Z")
      ? inputStr.slice(0, -1)
      : inputStr;
    const dateObj = new Date(normalized);
    return dateObj.toLocaleString("es-HN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Tegucigalpa",
    });
  };

  // Estados para el filtro de fechas (por defecto hoy a hoy)
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());

  // Estados para los datos y carga
  const [clientes, setClientes] = useState<UsuarioDigitalUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para ordenamiento
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;
  const [showAll, setShowAll] = useState(false);
  // Forzar refetch de reintentos aunque las fechas no cambien
  const [reintentosRefreshKey, setReintentosRefreshKey] = useState(0);

  // Búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"usuarios" | "reintentos">(
    "usuarios"
  );
  // Filtro por origen de creación (no visible en tabla)
  const [originFilter, setOriginFilter] = useState<"ALL" | "WEB" | "APP">(
    "APP"
  );

  // Columnas reordenables (drag & drop)
  type ColumnId =
    | "fechaUsuarioDigital"
    | "idUsuarioDigital"
    | "nombrePreferido"
    | "idContacto"
    | "correoApp"
    | "telefonoApp"
    | "motivoNoAfiliacion"
    | "nombreCompletoContacto"
    | "identificacion"
    | "tipoIdentificacion";

  interface ColumnDef {
    id: ColumnId;
    header: string;
    widthClass: string;
    sortable: boolean;
  }

  const [columns, setColumns] = useState<ColumnDef[]>([
    {
      id: "fechaUsuarioDigital",
      header: "Fecha Usuario Digital",
      widthClass: "w-40",
      sortable: true,
    },
    {
      id: "idUsuarioDigital",
      header: "Id Usuario Digital",
      widthClass: "w-30",
      sortable: true,
    },
    {
      id: "nombrePreferido",
      header: "Nombre Preferido",
      widthClass: "w-36",
      sortable: true,
    },
    {
      id: "idContacto",
      header: "Id Contacto",
      widthClass: "w-30",
      sortable: true,
    },
    {
      id: "correoApp",
      header: "Correo App",
      widthClass: "w-[20%]",
      sortable: true,
    },
    {
      id: "telefonoApp",
      header: "Teléfono App",
      widthClass: "w-[15%]",
      sortable: true,
    },
    {
      id: "motivoNoAfiliacion",
      header: "Motivo No Afiliación",
      widthClass: "w-48",
      sortable: true,
    },
    {
      id: "identificacion",
      header: "Identificación",
      widthClass: "w-[12%]",
      sortable: true,
    },
    {
      id: "nombreCompletoContacto",
      header: "Nombre Completo Contacto",
      widthClass: "w-[25%]",
      sortable: true,
    },
    {
      id: "tipoIdentificacion",
      header: "Tipo Identificación",
      widthClass: "w-[10%]",
      sortable: true,
    },
  ]);

  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);

  const handleColumnDragStart = (index: number) => setDraggedColIndex(index);
  const handleColumnDragOver = (e: React.DragEvent<HTMLTableCellElement>) => {
    e.preventDefault();
  };
  const handleColumnDrop = (index: number) => {
    if (draggedColIndex === null || draggedColIndex === index) return;
    setColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedColIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDraggedColIndex(null);
  };

  // Estados para el modal de motivo de no afiliación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioDigitalUI | null>(
    null
  );
  const [motivoNoAfiliacion, setMotivoNoAfiliacion] = useState("");

  // Estado para almacenar los motivos de no afiliación
  const [motivosNoAfiliacion, setMotivosNoAfiliacion] = useState<{
    [key: string]: string;
  }>({});

  // Función para cargar motivos desde la base de datos
  const fetchMotivos = useCallback(async () => {
    try {
      const response = await fetch("/api/motivos");
      if (response.ok) {
        const data: APIResponse<{ [key: string]: string }> =
          await response.json();
        if (data.success) {
          setMotivosNoAfiliacion(data.data);
        }
      }
    } catch (error) {
      console.error("Error cargando motivos:", error);
    }
  }, []);

  // Función para obtener datos de la API
  const fetchClientes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.append("fechaInicio", startDate);
      if (endDate) params.append("fechaFin", endDate);

      // Cargar datos de usuarios y motivos en paralelo
      const [usuariosResponse] = await Promise.all([
        fetch(`/api/usuarios-digitales-local?${params.toString()}`, {
          cache: "no-store",
        }),
        fetchMotivos(), // Cargar motivos cada vez que se cargan usuarios
      ]);

      if (!usuariosResponse.ok) {
        throw new Error("Error al obtener los datos");
      }

      const data: APIResponse<UsuarioDigitalFromAPI[]> =
        await usuariosResponse.json();

      if (data.success) {
        // Formatear datos para que coincidan con el formato esperado
        const clientesFormateados: UsuarioDigitalUI[] = data.data.map(
          (usuario: UsuarioDigitalFromAPI) => ({
            // Normalizar fechas del API local ("YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss")
            fechaUsuarioDigital: formatHondurasDate(
              usuario.fechaUsuarioDigital
                ? String(usuario.fechaUsuarioDigital).replace(" ", "T")
                : null
            ),
            ultimoInicioSesionApp: formatHondurasDate(
              usuario.ultimoInicioSesionApp
                ? String(usuario.ultimoInicioSesionApp).replace(" ", "T")
                : null
            ),
            // Coerción a string porque el API local devuelve números
            idUsuarioDigital: String(usuario.idUsuarioDigital),
            nombrePreferido: usuario.nombrePreferido || null,
            motivoNoAfiliacion: usuario.motivoNoAfiliacion ?? null,
            nombreCompletoContacto: usuario.nombreCompletoContacto || null,
            identificacion: usuario.identificacion || null,
            tipoIdentificacion: usuario.tipoIdentificacion || null,
            idContacto:
              usuario.idContacto !== undefined && usuario.idContacto !== null
                ? String(usuario.idContacto)
                : null,
            correoApp: usuario.correoApp || null,
            emailValidado: usuario.emailValidado ?? null,
            metodoAuth: usuario.metodoAuth ?? null,
            telefonoApp: usuario.telefonoApp || null,
            telefonoValidado: usuario.telefonoValidado ?? null,
            fotoPerfilApp: usuario.fotoPerfilApp || null,
            origenCreacion: usuario.origenCreacion
              ? (String(usuario.origenCreacion).toUpperCase() as "WEB" | "APP")
              : null,
          })
        );
        setClientes(clientesFormateados);
      } else {
        throw new Error(data.error || "Error desconocido");
      }
    } catch (error) {
      console.error("Error fetching clientes:", error);
      setError("Error al cargar los datos. Usando datos de ejemplo.");
      // En caso de error, usar datos de ejemplo
      setClientes([
        {
          fechaUsuarioDigital: formatHondurasDate(new Date()),
          ultimoInicioSesionApp: formatHondurasDate(new Date()),
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
          fotoPerfilApp: "/avatar1.jpg",
        },
        {
          fechaUsuarioDigital: formatHondurasDate(new Date(Date.now() - 60000)),
          ultimoInicioSesionApp: formatHondurasDate(
            new Date(Date.now() - 120000)
          ),
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
          fotoPerfilApp: "/avatar2.jpg",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, fetchMotivos]);

  // Efecto para cargar datos iniciales y cuando cambien las fechas
  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  // Efecto para cargar motivos al inicializar la aplicación
  useEffect(() => {
    fetchMotivos();
  }, [fetchMotivos]);

  // Efecto para manejar la tecla Escape para cerrar el modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isModalOpen) {
        handleCloseModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isModalOpen]);

  // Función para limpiar filtros (restablece a hoy y fuerza nueva consulta)
  const clearFilters = () => {
    const today = getTodayDate();
    setStartDate(today);
    setEndDate(today);
    setOriginFilter("APP");
    setCurrentPage(1);

    // Si estamos en "usuarios", forzar la recarga inmediata.
    // Si estamos en "reintentos", NO llamar a fetchClientes: el componente de reintentos
    // se actualizará por el cambio de fechas (props) en su propio efecto.
    if (activeView === "usuarios") {
      setIsLoading(true);
      console.log("🔄 Forzando actualización de datos (usuarios) para hoy...");
      setTimeout(() => {
        fetchClientes();
      }, 100);
    } else {
      // Forzar explícitamente el refetch de reintentos incluso si ya era hoy
      setReintentosRefreshKey((k) => k + 1);
    }
  };

  // Función para manejar el ordenamiento
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Si es la misma columna, cambiar dirección
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Si es una nueva columna, establecer ASC por defecto
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Función para obtener datos ordenados
  const getSortedData = () => {
    if (!sortColumn) return clientes;

    return [...clientes].sort((a, b) => {
      let valueA = a[sortColumn as keyof UsuarioDigitalUI];
      let valueB = b[sortColumn as keyof UsuarioDigitalUI];

      // Manejar valores nulos
      if (valueA === null || valueA === undefined) valueA = "";
      if (valueB === null || valueB === undefined) valueB = "";

      // Convertir a string para comparación
      const strA = String(valueA).toLowerCase();
      const strB = String(valueB).toLowerCase();

      // Ordenamiento para fechas (ahora con hora incluida)
      if (sortColumn === "fechaUsuarioDigital") {
        // Convertir formato español a Date
        const parseSpanishDate = (
          dateStr: string | boolean | null | undefined
        ) => {
          const str = String(dateStr || "");
          if (!str) return new Date("1900-01-01");
          // Formato mostrado: DD/MM/YYYY, HH:mm (en zona America/Tegucigalpa)
          const [datePart, timePart] = str.split(", ");
          const [day, month, year] = datePart.split("/");
          const [hour, minute] = timePart ? timePart.split(":") : ["00", "00"];
          const yearNum = parseInt(year, 10);
          const monthNum = parseInt(month, 10);
          const dayNum = parseInt(day, 10);
          const hourNum = parseInt(hour, 10);
          const minuteNum = parseInt(minute, 10);
          // Convertir hora de Honduras (UTC-6, sin DST) a UTC para comparar correctamente
          const utcMs = Date.UTC(
            yearNum,
            monthNum - 1,
            dayNum,
            hourNum + 6,
            minuteNum
          );
          return new Date(utcMs);
        };

        const dateA = parseSpanishDate(valueA);
        const dateB = parseSpanishDate(valueB);
        return sortDirection === "asc"
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }

      // Ordenamiento especial para motivoNoAfiliacion: usar valor mostrado (propiedad o fallback del mapa)
      if (sortColumn === "motivoNoAfiliacion") {
        const getMotivo = (u: UsuarioDigitalUI) => {
          const direct = (u.motivoNoAfiliacion || "").trim();
          if (direct !== "") return direct.toLowerCase();
          const fromMap = motivosNoAfiliacion[u.idUsuarioDigital || ""] || "";
          return String(fromMap).toLowerCase();
        };
        const motivoA = getMotivo(a);
        const motivoB = getMotivo(b);
        if (motivoA < motivoB) {
          return sortDirection === "asc" ? -1 : 1;
        }
        if (motivoA > motivoB) {
          return sortDirection === "asc" ? 1 : -1;
        }
        return 0;
      }

      // Ordenamiento alfanumérico para el resto
      if (strA < strB) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (strA > strB) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  // Datos visibles según paginación
  const getFilteredData = () => {
    const q = searchQuery.trim().toLowerCase();
    const byOrigin = clientes.filter((c) =>
      originFilter === "ALL" ? true : c.origenCreacion === originFilter
    );
    if (!q) return byOrigin;
    return byOrigin.filter((c) => {
      const telefono = (c.telefonoApp || "").toLowerCase();
      const nombrePref = (c.nombrePreferido || "").toLowerCase();
      const correo = (c.correoApp || "").toLowerCase();
      const nombreContacto = (c.nombreCompletoContacto || "").toLowerCase();
      const identificacion = (c.identificacion || "").toLowerCase();
      const motivoDirecto = (c.motivoNoAfiliacion || "").toLowerCase();
      const motivoMapa = (
        motivosNoAfiliacion[c.idUsuarioDigital || ""] || ""
      ).toLowerCase();
      return (
        telefono.includes(q) ||
        nombrePref.includes(q) ||
        correo.includes(q) ||
        nombreContacto.includes(q) ||
        identificacion.includes(q) ||
        motivoDirecto.includes(q) ||
        motivoMapa.includes(q)
      );
    });
  };

  const getVisibleData = () => {
    const filtered = getFilteredData();
    // Ordenar sobre el conjunto filtrado
    const sorted = (() => {
      if (!sortColumn) return filtered;
      // Reutilizar la lógica de getSortedData aplicándola al subconjunto filtrado
      return [...filtered].sort((a, b) => {
        let valueA = a[sortColumn as keyof UsuarioDigitalUI];
        let valueB = b[sortColumn as keyof UsuarioDigitalUI];
        if (valueA === null || valueA === undefined)
          valueA = "" as unknown as typeof valueA;
        if (valueB === null || valueB === undefined)
          valueB = "" as unknown as typeof valueB;
        const strA = String(valueA).toLowerCase();
        const strB = String(valueB).toLowerCase();
        if (sortColumn === "fechaUsuarioDigital") {
          const parseSpanishDate = (
            dateStr: string | boolean | null | undefined
          ) => {
            const str = String(dateStr || "");
            if (!str) return new Date("1900-01-01");
            const [datePart, timePart] = str.split(", ");
            const [day, month, year] = datePart.split("/");
            const [hour, minute] = timePart
              ? timePart.split(":")
              : ["00", "00"];
            const yearNum = parseInt(year, 10);
            const monthNum = parseInt(month, 10);
            const dayNum = parseInt(day, 10);
            const hourNum = parseInt(hour, 10);
            const minuteNum = parseInt(minute, 10);
            const utcMs = Date.UTC(
              yearNum,
              monthNum - 1,
              dayNum,
              hourNum + 6,
              minuteNum
            );
            return new Date(utcMs);
          };
          const dateA = parseSpanishDate(valueA);
          const dateB = parseSpanishDate(valueB);
          return sortDirection === "asc"
            ? dateA.getTime() - dateB.getTime()
            : dateB.getTime() - dateA.getTime();
        }
        if (sortColumn === "motivoNoAfiliacion") {
          const getMotivo = (u: UsuarioDigitalUI) => {
            const direct = (u.motivoNoAfiliacion || "").trim();
            if (direct !== "") return direct.toLowerCase();
            const fromMap = motivosNoAfiliacion[u.idUsuarioDigital || ""] || "";
            return String(fromMap).toLowerCase();
          };
          const motivoA = getMotivo(a);
          const motivoB = getMotivo(b);
          if (motivoA < motivoB) return sortDirection === "asc" ? -1 : 1;
          if (motivoA > motivoB) return sortDirection === "asc" ? 1 : -1;
          return 0;
        }
        if (strA < strB) return sortDirection === "asc" ? -1 : 1;
        if (strA > strB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    })();
    if (showAll) return sorted;
    const startIdx = (currentPage - 1) * rowsPerPage;
    const endIdx = startIdx + rowsPerPage;
    return sorted.slice(startIdx, endIdx);
  };
  const filteredCount = getFilteredData().length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / rowsPerPage));

  // Reiniciar a la primera página cuando cambian filtros/orden
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, sortColumn, sortDirection]);

  // Reiniciar página cuando cambia búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Función para contar registros sin contacto
  const getContactStats = () => {
    const withoutContact = clientes.filter(
      (row) =>
        !row.idContacto || row.idContacto === null || row.idContacto === ""
    ).length;
    const withContact = clientes.length - withoutContact;
    return { withContact, withoutContact };
  };

  // Funciones para el modal
  const handleRowDoubleClick = (user: UsuarioDigitalUI) => {
    setSelectedUser(user);
    // Si ya existe un motivo, pre-llenarlo en el textarea
    const existingMotivo =
      motivosNoAfiliacion[user.idUsuarioDigital || ""] ||
      user.motivoNoAfiliacion ||
      "";
    setMotivoNoAfiliacion(existingMotivo);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setMotivoNoAfiliacion("");
  };

  const handleSaveMotivo = async () => {
    if (motivoNoAfiliacion.trim()) {
      const userId = selectedUser?.idUsuarioDigital;
      if (userId) {
        try {
          // Intentar guardar en la base de datos
          const response = await fetch("/api/motivos", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idUsuarioDigital: userId,
              motivo: motivoNoAfiliacion.trim(),
            }),
          });

          const result = await response.json();

          if (result.success) {
            // Actualizar el estado local también
            setMotivosNoAfiliacion((prev) => ({
              ...prev,
              [userId]: motivoNoAfiliacion.trim(),
            }));

            // Reflejar de inmediato en la tabla
            setClientes((prev) =>
              prev.map((u) =>
                u.idUsuarioDigital === userId
                  ? { ...u, motivoNoAfiliacion: motivoNoAfiliacion.trim() }
                  : u
              )
            );

            console.log("✅ Motivo guardado en BD para usuario:", userId);
            alert(
              `✅ Motivo guardado en BD para ${
                selectedUser?.nombrePreferido || selectedUser?.idUsuarioDigital
              }`
            );

            handleCloseModal();
          } else {
            throw new Error(result.error || "Error al guardar");
          }
        } catch (error) {
          console.error(
            "❌ Error guardando en BD, usando estado local:",
            error
          );

          // Si falla la BD, guardar solo en estado local
          setMotivosNoAfiliacion((prev) => ({
            ...prev,
            [userId]: motivoNoAfiliacion.trim(),
          }));

          alert(
            `⚠️ Motivo guardado localmente para ${
              selectedUser?.nombrePreferido || selectedUser?.idUsuarioDigital
            }\n(No se pudo guardar en BD - verificar permisos)`
          );

          handleCloseModal();
        }
      }
    } else {
      alert("Por favor ingresa un motivo de no afiliación");
    }
  };

  // Componente para el icono de ordenamiento
  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return (
        <svg
          className="w-4 h-4 ml-1 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }

    if (sortDirection === "asc") {
      return (
        <svg
          className="w-4 h-4 ml-1 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      );
    } else {
      return (
        <svg
          className="w-4 h-4 ml-1 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
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

        {/* Filtros y Búsqueda */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            <div className="w-56">
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Fecha Inicio
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>
            <div className="w-56">
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Fecha Fin
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>
            <div className="w-full lg:w-64">
              <label
                htmlFor="searchQuery"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Buscar (teléfono, preferido, correo, contacto, identificación,
                motivo)
              </label>
              <input
                type="text"
                id="searchQuery"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ej: 9876, maria, @gmail.com, juan perez, 0501..., sin documento"
                className="w-full h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearFilters}
                className="h-9 px-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors"
                title="Restablecer a hoy y actualizar datos"
              >
                🔄 Hoy
              </button>
              {/* Filtro de Origen */}
              <div>
                <select
                  id="originFilter"
                  value={originFilter}
                  onChange={(e) =>
                    setOriginFilter(e.target.value as "ALL" | "WEB" | "APP")
                  }
                  className="h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                >
                  <option value="ALL">Todos</option>
                  <option value="WEB">WEB</option>
                  <option value="APP">APP</option>
                </select>
              </div>
              <button
                onClick={() =>
                  setActiveView((v) =>
                    v === "usuarios" ? "reintentos" : "usuarios"
                  )
                }
                className="h-9 px-3 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 transition-colors"
                title="Cambiar a reporte de reintentos"
              >
                {activeView === "reintentos"
                  ? "Ver Usuarios"
                  : "Reporte Reintentos"}
              </button>
              <div className="flex gap-2 flex-wrap">
                <div className="h-9 px-2 text-xs flex items-center bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800">
                  {isLoading
                    ? "Cargando..."
                    : `${filteredCount} resultado${
                        filteredCount !== 1 ? "s" : ""
                      }`}
                </div>
                {!isLoading && clientes.length > 0 && (
                  <div className="h-9 px-2 text-xs flex items-center bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md border border-red-200 dark:border-red-800">
                    Sin Contacto:{" "}
                    {
                      getVisibleData().filter(
                        (row) => !row.idContacto || row.idContacto === ""
                      ).length
                    }
                  </div>
                )}
                {sortColumn && (
                  <div className="h-9 px-2 text-xs flex items-center bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md border border-green-200 dark:border-green-800">
                    Ordenado:{" "}
                    {sortColumn
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase())}{" "}
                    ({sortDirection.toUpperCase()})
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
        {activeView === "reintentos" ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <ReporteReintentos
              startDate={startDate}
              endDate={endDate}
              refreshKey={reintentosRefreshKey}
            />
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {columns.map((col, index) => (
                        <th
                          key={col.id}
                          className={`${col.widthClass} px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider select-none`}
                          draggable
                          onDragStart={() => handleColumnDragStart(index)}
                          onDragOver={handleColumnDragOver}
                          onDrop={() => handleColumnDrop(index)}
                          title="Arrastra para reordenar"
                        >
                          {col.sortable ? (
                            <button
                              onClick={() => handleSort(col.id)}
                              className="flex items-center hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                            >
                              {col.header}
                              <SortIcon column={col.id} />
                            </button>
                          ) : (
                            <span>{col.header}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                        >
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3">Cargando datos...</span>
                          </div>
                        </td>
                      </tr>
                    ) : clientes.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                        >
                          No se encontraron registros para el rango de fechas
                          seleccionado
                        </td>
                      </tr>
                    ) : (
                      getVisibleData().map((row, index) => {
                        const isContactNull =
                          !row.idContacto ||
                          row.idContacto === null ||
                          row.idContacto === "";
                        return (
                          <tr
                            key={index}
                            className={`transition-colors cursor-pointer ${
                              isContactNull
                                ? "bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 border-l-4 border-red-500"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                            onDoubleClick={() => handleRowDoubleClick(row)}
                            title="Doble clic para agregar motivo de no afiliación"
                          >
                            {columns.map((col) => {
                              switch (col.id) {
                                case "fechaUsuarioDigital":
                                  return (
                                    <td
                                      key={col.id}
                                      className={`${col.widthClass} px-3 py-3 text-sm text-gray-900 dark:text-gray-100`}
                                    >
                                      <div className="font-mono text-xs leading-tight">
                                        {row.fechaUsuarioDigital}
                                      </div>
                                    </td>
                                  );
                                case "idUsuarioDigital":
                                  return (
                                    <td
                                      key={col.id}
                                      className={`${col.widthClass} px-3 py-3 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400`}
                                    >
                                      <div className="truncate text-xs">
                                        {row.idUsuarioDigital}
                                      </div>
                                    </td>
                                  );
                                case "nombrePreferido":
                                  return (
                                    <td
                                      key={col.id}
                                      className={`${col.widthClass} px-3 py-3 text-sm text-gray-900 dark:text-gray-100`}
                                    >
                                      <div className="truncate text-xs font-medium">
                                        {row.nombrePreferido || "-"}
                                      </div>
                                    </td>
                                  );
                                case "idContacto":
                                  return (
                                    <td
                                      key={col.id}
                                      className={`${col.widthClass} px-3 py-3 text-sm text-gray-900 dark:text-gray-100`}
                                    >
                                      {row.idContacto ? (
                                        <div className="truncate text-xs text-gray-900 dark:text-gray-100">
                                          {row.idContacto}
                                        </div>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                          SIN CONTACTO
                                        </span>
                                      )}
                                    </td>
                                  );
                                case "correoApp":
                                  return (
                                    <td
                                      key={col.id}
                                      className={`${col.widthClass} px-3 py-3 text-sm text-gray-900 dark:text-gray-100`}
                                    >
                                      {row.correoApp ? (
                                        <a
                                          href={`mailto:${row.correoApp}`}
                                          className="text-blue-600 dark:text-blue-400 hover:underline text-xs truncate block"
                                          title={row.correoApp}
                                        >
                                          {row.correoApp}
                                        </a>
                                      ) : (
                                        <span className="text-xs text-gray-400">
                                          -
                                        </span>
                                      )}
                                    </td>
                                  );
                                case "telefonoApp":
                                  return (
                                    <td
                                      key={col.id}
                                      className={`${col.widthClass} px-3 py-3 text-sm text-gray-900 dark:text-gray-100`}
                                    >
                                      {row.telefonoApp ? (
                                        <a
                                          href={`tel:${row.telefonoApp}`}
                                          className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-mono truncate block"
                                        >
                                          {row.telefonoApp}
                                        </a>
                                      ) : (
                                        <span className="text-xs text-gray-400">
                                          -
                                        </span>
                                      )}
                                    </td>
                                  );
                                case "motivoNoAfiliacion":
                                  return (
                                    <td
                                      key={col.id}
                                      className={`${col.widthClass} px-3 py-3 text-sm text-gray-900 dark:text-gray-100`}
                                    >
                                      {(row.motivoNoAfiliacion &&
                                        row.motivoNoAfiliacion.trim() !== "") ||
                                      motivosNoAfiliacion[
                                        row.idUsuarioDigital || ""
                                      ] ? (
                                        <p
                                          className="text-xs text-gray-800 dark:text-gray-200 truncate leading-relaxed"
                                          title={
                                            row.motivoNoAfiliacion &&
                                            row.motivoNoAfiliacion.trim() !== ""
                                              ? row.motivoNoAfiliacion
                                              : motivosNoAfiliacion[
                                                  row.idUsuarioDigital || ""
                                                ]
                                          }
                                        >
                                          {row.motivoNoAfiliacion &&
                                          row.motivoNoAfiliacion.trim() !== ""
                                            ? row.motivoNoAfiliacion
                                            : motivosNoAfiliacion[
                                                row.idUsuarioDigital || ""
                                              ]}
                                        </p>
                                      ) : (
                                        <span className="text-gray-400 dark:text-gray-500 text-xs italic">
                                          Sin motivo registrado
                                        </span>
                                      )}
                                    </td>
                                  );
                                case "nombreCompletoContacto":
                                  return (
                                    <td
                                      key={col.id}
                                      className={`${col.widthClass} px-3 py-3 text-sm text-gray-900 dark:text-gray-100`}
                                    >
                                      <div
                                        className="truncate text-xs"
                                        title={row.nombreCompletoContacto || ""}
                                      >
                                        {row.nombreCompletoContacto || "-"}
                                      </div>
                                    </td>
                                  );
                                case "identificacion":
                                  return (
                                    <td
                                      key={col.id}
                                      className={`${col.widthClass} px-3 py-3 text-sm text-gray-900 dark:text-gray-100`}
                                    >
                                      <div className="text-xs font-mono truncate">
                                        {row.identificacion || "-"}
                                      </div>
                                    </td>
                                  );
                                case "tipoIdentificacion":
                                  return (
                                    <td
                                      key={col.id}
                                      className={`${col.widthClass} px-3 py-3 text-sm text-gray-900 dark:text-gray-100`}
                                    >
                                      {row.tipoIdentificacion ? (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                          {row.tipoIdentificacion}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-gray-400">
                                          -
                                        </span>
                                      )}
                                    </td>
                                  );
                                default:
                                  return null;
                              }
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Controles de paginación */}
            <div className="bg-white dark:bg-gray-800 rounded-b-lg border border-t-0 border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {showAll
                  ? `Mostrando todos (${clientes.length})`
                  : `Página ${currentPage} de ${totalPages} (${Math.min(
                      rowsPerPage,
                      Math.max(
                        0,
                        clientes.length - (currentPage - 1) * rowsPerPage
                      )
                    )} de ${clientes.length})`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={showAll || currentPage <= 1}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    showAll || currentPage <= 1
                      ? "text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed"
                      : "text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  title="Anterior"
                >
                  ◀ Anterior
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={showAll || currentPage >= totalPages}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    showAll || currentPage >= totalPages
                      ? "text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed"
                      : "text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  title="Siguiente"
                >
                  Siguiente ▶
                </button>
                <button
                  onClick={() => {
                    setShowAll((v) => !v);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 text-sm rounded-md border border-blue-600 text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  {showAll ? "Ver 50 por página" : "Ver todo"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Footer con información adicional */}
        {activeView !== "reintentos" && (
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <div>
              {isLoading ? (
                "Cargando..."
              ) : (
                <>
                  Mostrando {clientes.length} registros
                  {(startDate || endDate) && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      (filtrado{startDate && ` desde ${startDate}`}
                      {endDate && ` hasta ${endDate}`})
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="mt-2 sm:mt-0">
              Última actualización: {formatHondurasDate(new Date())}
            </div>
          </div>
        )}

        {/* Modal para Motivo de No Afiliación */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Información del Usuario */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Usuario:</span>{" "}
                    {selectedUser?.nombrePreferido || "Sin nombre"}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">ID:</span>{" "}
                    {selectedUser?.idUsuarioDigital}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Email:</span>{" "}
                    {selectedUser?.correoApp || "Sin email"}
                  </p>
                  {!selectedUser?.idContacto && (
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      ⚠️ Usuario sin contacto asignado
                    </p>
                  )}
                  {selectedUser?.idUsuarioDigital &&
                    motivosNoAfiliacion[selectedUser.idUsuarioDigital] && (
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
