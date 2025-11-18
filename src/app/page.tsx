"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import type {
  UsuarioDigitalUI,
  UsuarioDigitalFromAPI,
  APIResponse,
} from "../../types/usuario";
import ReporteReintentos from "./components/ReporteReintentos";

export default function Home() {
  const API_BASE = process.env.API_BASE_URL || "http://localhost:4040";
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
  const [reintentosUserIdsFilter, setReintentosUserIdsFilter] = useState<
    string[]
  >([]);

  // Búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<
    "usuarios" | "reintentos" | "global" | "metricas"
  >("usuarios");
  // Filtro por origen de creación (no visible en tabla)
  const [originFilter, setOriginFilter] = useState<"ALL" | "WEB" | "APP">(
    "APP"
  );

  // Tabs para Reporte Métricas
  const [metricasTab, setMetricasTab] = useState<
    | "afiliacionIntentos"
    | "tiempoAfiliacionIntento"
    | "proveedores"
    | "fotosTienda"
    | "afiliacionesNuevos"
  >("afiliacionIntentos");
  const USE_FAKE_METRICAS = false;
  const [showCompareIntentos, setShowCompareIntentos] = useState(false);
  const [showCompareMinutos, setShowCompareMinutos] = useState(false);

  // Estado para Reporte Global
  type ReporteGlobalItem = {
    tiempo_enrolamiento_completo_en_minutos?: number | null;
    usuariodigital_fh_registro?: string | null;
    contacto_fh_registro?: string | null;
    clientelealtad_fh_registro?: string | null;
    conteo_intentos?: number | null;
    fecha_creacion_date?: string | null;
    fecha_hora_ultimo_log?: string | null;
    edad?: number | null;
    rango_edad_cliente?: string | null;
    proveedor?: string | null;
    id_usuario_digital?: number | null;
    id_contacto?: number | null;
    nombre_preferido?: string | null;
    telefono?: string | null;
    email?: string | null;
    nombre_completo?: string | null;
    id_cliente_lealtad?: number | null;
    id_pais?: number | null;
    identificacion?: string | null;
    identificacion_tipo_dato?: string | null;
    identificacion_validada?: boolean | null;
    identificacion_escaneada?: boolean | null;
    genero?: string | null;
    fecha_nacimiento?: string | null;
    ultimo_log?: string | null;
    sucursal_venta?: string | null;
    conteo_conflictos?: number | null;
    origen_creacion?: string | null;
    // campos adicionales posibles ignorados
    [key: string]: unknown;
  };
  type Pagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextPage?: number;
    previousPage?: number;
  };
  const [globalItems, setGlobalItems] = useState<ReporteGlobalItem[]>([]);
  const [globalPagination, setGlobalPagination] = useState<Pagination | null>(
    null
  );
  const [globalIsLoading, setGlobalIsLoading] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalPage, setGlobalPage] = useState<number>(1);
  const [globalLimit, setGlobalLimit] = useState<number>(5);
  const [globalKeys, setGlobalKeys] = useState<string[]>([]);

  // Vista INTENTOS (agregados por día)
  const [showGlobalIntentos, setShowGlobalIntentos] = useState<boolean>(false);
  const [intentosIsLoading, setIntentosIsLoading] = useState<boolean>(false);
  const [intentosError, setIntentosError] = useState<string | null>(null);
  type IntentosRow = {
    fecha: string;
    c1: number;
    p1: number;
    c2: number;
    p2: number;
    c3: number;
    p3: number;
    c4: number;
    p4: number;
    c6: number;
    p6: number;
    cNull: number;
    pNull: number;
    total: number;
    pTotal: number;
  };
  const [intentosRows, setIntentosRows] = useState<IntentosRow[]>([]);
  type IntentosTotals = {
    total: number;
    c1: number;
    c2: number;
    c3: number;
    c4: number;
    c6: number;
    cNull: number;
  };
  const [intentosTotals, setIntentosTotals] = useState<IntentosTotals | null>(
    null
  );
  const [intentosAll, setIntentosAll] = useState<ReporteGlobalItem[]>([]);
  const [tiempoAll, setTiempoAll] = useState<ReporteGlobalItem[]>([]);
  const [intentosDetail, setIntentosDetail] = useState<
    ReporteGlobalItem[] | null
  >(null);
  const [intentosDetailTitle, setIntentosDetailTitle] = useState<string>("");
  const [intentosDetailKeys, setIntentosDetailKeys] = useState<string[]>([]);
  const [showGlobalPromedio, setShowGlobalPromedio] = useState<boolean>(false);
  const [promedioIsLoading, setPromedioIsLoading] = useState<boolean>(false);
  // Evitar múltiples llamadas al cargar la pestaña de métricas de intentos
  const intentosLoadedRef = useRef<boolean>(false);
  // Filtro sucursal para Afiliación X Intentos
  const [filtroSucursalIntentos, setFiltroSucursalIntentos] =
    useState<string>("");
  // Filtro sucursal para Tiempo Afiliación X Intento
  const [filtroSucursalTiempo, setFiltroSucursalTiempo] = useState<string>("");
  // Filtros de fecha por tabla (A: principal, B: comparación)
  const [fechaInicioA, setFechaInicioA] = useState<string>(getTodayDate());
  const [fechaFinA, setFechaFinA] = useState<string>(getTodayDate());
  const [fechaInicioB, setFechaInicioB] = useState<string>("");
  const [fechaFinB, setFechaFinB] = useState<string>("");
  // Filtros y estado para Fotos Tienda
  const [fechaInicioFotos, setFechaInicioFotos] = useState<string>(
    getTodayDate()
  );
  const [fechaFinFotos, setFechaFinFotos] = useState<string>(getTodayDate());
  type ImagenIntento = {
    idTipoImagen: number | null;
    fechaRegistro: string | null;
    imagen: string | null;
    data: string | null;
  };

  type Intento = {
    idIntento: string | null;
    imagenes: ImagenIntento[] | null;
  };

  type FotoItem = {
    id: number | string;
    nombre_preferido: string | null;
    sucursal_venta: string | null;
    asesor_venta: string | null;
    url_imagen_frontal: string | null;
    url_imagen_trasera: string | null;
    url_imagen_selfie: string | null;
    id_contacto: number | null;
    id_usuario_digital: string | null;
    tuvo_conflicto: boolean;
    intentos: Intento[] | null;
  };
  const [fotosItems, setFotosItems] = useState<FotoItem[]>([]);
  const [fotosIsLoading, setFotosIsLoading] = useState<boolean>(false);
  const [fotosError, setFotosError] = useState<string | null>(null);
  const [filtroSucursalFotos, setFiltroSucursalFotos] = useState<string>("");
  const [filtroAfiliacionFotos, setFiltroAfiliacionFotos] =
    useState<string>(""); // "" | "AFILIADO" | "NO-AFILIADO"
  const [filtroConflictoFotos, setFiltroConflictoFotos] = useState<string>(""); // "" | "CON-CONFLICTO" | "SIN-CONFLICTO"
  const [fotosSearch, setFotosSearch] = useState<string>("");
  const [fotosUserIdsFilter, setFotosUserIdsFilter] = useState<string[]>([]);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const sucursalesFotos = useMemo(() => {
    const set = new Set<string>();
    for (const it of fotosItems) {
      const s = (it.sucursal_venta || "").toString().trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [fotosItems]);
  const fotosFiltrados = useMemo(() => {
    // Filtro inicial: solo usuarios que tienen intentos (no null)
    let base = fotosItems.filter(
      (r) => r.intentos !== null && r.intentos.length > 0
    );

    // Filtro por sucursal
    base =
      filtroSucursalFotos === ""
        ? base
        : filtroSucursalFotos === "__NULL__"
        ? base.filter((r) => !(r.sucursal_venta || "").toString().trim())
        : base.filter(
            (r) => (r.sucursal_venta || "").toString() === filtroSucursalFotos
          );

    // Filtro por id_usuario_digital (si hay un filtro activo)
    if (fotosUserIdsFilter && fotosUserIdsFilter.length > 0) {
      const set = new Set(fotosUserIdsFilter.map((v) => String(v)));
      base = base.filter(
        (r) =>
          r.id_usuario_digital != null && set.has(String(r.id_usuario_digital))
      );
    }

    // Filtro por afiliación
    if (filtroAfiliacionFotos === "AFILIADO") {
      base = base.filter((r) => r.id_contacto != null);
    } else if (filtroAfiliacionFotos === "NO-AFILIADO") {
      base = base.filter((r) => r.id_contacto == null);
    }

    // Filtro por conflicto
    if (filtroConflictoFotos === "CON-CONFLICTO") {
      base = base.filter((r) => r.tuvo_conflicto === true);
    } else if (filtroConflictoFotos === "SIN-CONFLICTO") {
      base = base.filter((r) => r.tuvo_conflicto === false);
    }

    // Filtro por texto (nombre, asesor, sucursal)
    const q = fotosSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) => {
      const nombre = (r.nombre_preferido || "").toLowerCase();
      const asesor = (r.asesor_venta || "").toLowerCase();
      const suc = (r.sucursal_venta || "").toLowerCase();
      return nombre.includes(q) || asesor.includes(q) || suc.includes(q);
    });
  }, [
    fotosItems,
    filtroSucursalFotos,
    filtroAfiliacionFotos,
    filtroConflictoFotos,
    fotosSearch,
    fotosUserIdsFilter,
  ]);

  // Estados para Afiliaciones X Intentos Nuevos
  type AfiliacionNuevaItem = {
    idUsuarioDigital: number;
    fecha_creacion: string;
    cantidadIntentos: number;
    cantCorreccionFrontal: number;
    cantCorreccionTrasera: number;
    cantCorreccionSelfie: number;
  };
  const [afiliacionesNuevosItems, setAfiliacionesNuevosItems] = useState<
    AfiliacionNuevaItem[]
  >([]);
  const [afiliacionesNuevosIsLoading, setAfiliacionesNuevosIsLoading] =
    useState<boolean>(false);
  const [afiliacionesNuevosError, setAfiliacionesNuevosError] = useState<
    string | null
  >(null);
  const [fechaInicioAfiliacionesNuevos, setFechaInicioAfiliacionesNuevos] =
    useState<string>(getTodayDate());
  const [fechaFinAfiliacionesNuevos, setFechaFinAfiliacionesNuevos] =
    useState<string>(getTodayDate());

  // Agregar datos por fecha para Afiliaciones X Intentos Nuevos
  type AfiliacionesNuevosAgg = {
    fecha: string;
    intentosCounts: Record<number, number>; // { 1: 5, 2: 3, 3: 1, ... }
    correccionesFrontal: number;
    correccionesTrasera: number;
    correccionesSelfie: number;
    total: number;
    usuariosFrontal: number;
    usuariosTrasera: number;
    usuariosSelfie: number;
  };

  // Obtener todos los valores únicos de intentos
  const intentosUnicos = useMemo(() => {
    const intentos = new Set<number>();
    for (const item of afiliacionesNuevosItems) {
      if (item.cantidadIntentos) {
        intentos.add(item.cantidadIntentos);
      }
    }
    return Array.from(intentos).sort((a, b) => a - b);
  }, [afiliacionesNuevosItems]);

  const afiliacionesNuevosAgrupado = useMemo(() => {
    const byDate = new Map<string, AfiliacionesNuevosAgg>();

    for (const item of afiliacionesNuevosItems) {
      const fecha = item.fecha_creacion || "desconocida";

      if (!byDate.has(fecha)) {
        byDate.set(fecha, {
          fecha,
          intentosCounts: {},
          correccionesFrontal: 0,
          correccionesTrasera: 0,
          correccionesSelfie: 0,
          total: 0,
          usuariosFrontal: 0,
          usuariosTrasera: 0,
          usuariosSelfie: 0,
        });
      }

      const row = byDate.get(fecha)!;
      row.total += 1;

      // Contar usuarios por cantidad de intentos
      const intentosKey = item.cantidadIntentos || 0;
      row.intentosCounts[intentosKey] =
        (row.intentosCounts[intentosKey] || 0) + 1;

      // Sumar la cantidad de correcciones
      row.correccionesFrontal += item.cantCorreccionFrontal;
      row.correccionesTrasera += item.cantCorreccionTrasera;
      row.correccionesSelfie += item.cantCorreccionSelfie;

      // Contar usuarios que tienen correcciones (para el porcentaje)
      if (item.cantCorreccionFrontal > 0) {
        row.usuariosFrontal += 1;
      }
      if (item.cantCorreccionTrasera > 0) {
        row.usuariosTrasera += 1;
      }
      if (item.cantCorreccionSelfie > 0) {
        row.usuariosSelfie += 1;
      }
    }

    // Ordenar por fecha descendente
    const sorted = Array.from(byDate.values()).sort((a, b) =>
      b.fecha.localeCompare(a.fecha)
    );

    return sorted;
  }, [afiliacionesNuevosItems]);

  // Filtros de fecha para Tiempo Afiliación X Intento
  const [fechaInicioTiempo, setFechaInicioTiempo] = useState<string>(
    getTodayDate()
  );
  const [fechaFinTiempo, setFechaFinTiempo] = useState<string>(getTodayDate());
  const sucursalesIntentos = useMemo(() => {
    const set = new Set<string>();
    for (const it of intentosAll) {
      const s = (it.sucursal_venta || "").toString().trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [intentosAll]);
  // Columnas dinámicas para Afiliación X Intentos (según buckets presentes)
  const intentosDynamic = useMemo(() => {
    type RowAgg = {
      total: number;
      nullCount: number;
      counts: Record<number, number>;
    };
    const byDate = new Map<string, RowAgg>();
    const bucketSet = new Set<number>();

    // Filtrar por sucursal
    const filtered: ReporteGlobalItem[] =
      filtroSucursalIntentos === ""
        ? intentosAll
        : filtroSucursalIntentos === "__NULL__"
        ? intentosAll.filter((r) => !(r.sucursal_venta || "").toString().trim())
        : intentosAll.filter(
            (r) =>
              (r.sucursal_venta || "").toString() === filtroSucursalIntentos
          );

    for (const it of filtered) {
      const rec = it as Record<string, unknown>;
      const fecha = String(
        (rec["fecha_creacion_date"] as string | undefined) ||
          (rec["fecha_creacion"] as string | undefined) ||
          ""
      );
      if (!fecha) continue;
      if (fechaInicioA && fecha < fechaInicioA) continue;
      if (fechaFinA && fecha > fechaFinA) continue;

      if (!byDate.has(fecha)) {
        byDate.set(fecha, { total: 0, nullCount: 0, counts: {} });
      }
      const entry = byDate.get(fecha)!;
      entry.total += 1;

      const vRaw = rec["conteo_intentos"] as unknown;
      const vNum =
        vRaw === null || vRaw === undefined
          ? null
          : typeof vRaw === "number"
          ? vRaw
          : Number(vRaw as string);

      if (vNum === null || Number.isNaN(vNum)) {
        entry.nullCount += 1;
      } else {
        entry.counts[vNum] = (entry.counts[vNum] || 0) + 1;
        bucketSet.add(vNum);
      }
    }

    const buckets = Array.from(bucketSet).sort((a, b) => a - b);
    const rows = Array.from(byDate.entries())
      .map(([fecha, entry]) => ({ fecha, ...entry }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    const hasNull = rows.some((r) => r.nullCount > 0);

    return { buckets, rows, hasNull };
  }, [intentosAll, fechaInicioA, fechaFinA, filtroSucursalIntentos]);
  // Dinámica de promedios de minutos por bucket (Tiempo Afiliación X Intento)
  const tiempoDynamic = useMemo(() => {
    type BucketAgg = { sum: number; count: number };
    type RowAgg = {
      total: BucketAgg;
      nullAgg: BucketAgg;
      buckets: Record<number, BucketAgg>;
    };
    const byDate = new Map<string, RowAgg>();
    const bucketSet = new Set<number>();

    // Filtrar por sucursal
    const filtered: ReporteGlobalItem[] =
      filtroSucursalTiempo === ""
        ? tiempoAll
        : filtroSucursalTiempo === "__NULL__"
        ? tiempoAll.filter((r) => !(r.sucursal_venta || "").toString().trim())
        : tiempoAll.filter(
            (r) => (r.sucursal_venta || "").toString() === filtroSucursalTiempo
          );

    for (const it of filtered) {
      const rec = it as Record<string, unknown>;
      const fecha = String(
        (rec["fecha_creacion_date"] as string | undefined) ||
          (rec["fecha_creacion"] as string | undefined) ||
          ""
      );
      if (!fecha) continue;
      if (fechaInicioTiempo && fecha < fechaInicioTiempo) continue;
      if (fechaFinTiempo && fecha > fechaFinTiempo) continue;

      if (!byDate.has(fecha)) {
        byDate.set(fecha, {
          total: { sum: 0, count: 0 },
          nullAgg: { sum: 0, count: 0 },
          buckets: {},
        });
      }
      const entry = byDate.get(fecha)!;

      const vRaw = rec["conteo_intentos"] as unknown;
      const vNum =
        vRaw === null || vRaw === undefined
          ? null
          : typeof vRaw === "number"
          ? vRaw
          : Number(vRaw as string);

      const mRaw = rec["minutos"] as unknown;
      const mNum =
        mRaw === null || mRaw === undefined
          ? null
          : typeof mRaw === "number"
          ? mRaw
          : Number(mRaw as string);
      if (mNum == null || Number.isNaN(mNum)) continue; // si no hay minutos, no se promedia

      entry.total.sum += mNum;
      entry.total.count += 1;

      if (vNum === null || Number.isNaN(vNum)) {
        entry.nullAgg.sum += mNum;
        entry.nullAgg.count += 1;
      } else {
        if (!entry.buckets[vNum]) entry.buckets[vNum] = { sum: 0, count: 0 };
        entry.buckets[vNum].sum += mNum;
        entry.buckets[vNum].count += 1;
        bucketSet.add(vNum);
      }
    }

    const buckets = Array.from(bucketSet).sort((a, b) => a - b);
    const rows = Array.from(byDate.entries())
      .map(([fecha, agg]) => ({
        fecha,
        agg,
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    const hasNull = rows.some((r) => r.agg.nullAgg.count > 0);

    return { buckets, rows, hasNull };
  }, [tiempoAll, fechaInicioTiempo, fechaFinTiempo, filtroSucursalTiempo]);
  const intentosRowsFiltrados = useMemo(() => {
    if (USE_FAKE_METRICAS) return null as unknown as IntentosRow[];
    // Filtrar intentosAll por sucursal y re-agrupar
    const filtered: ReporteGlobalItem[] =
      filtroSucursalIntentos === ""
        ? intentosAll
        : filtroSucursalIntentos === "__NULL__"
        ? intentosAll.filter((r) => !(r.sucursal_venta || "").toString().trim())
        : intentosAll.filter(
            (r) =>
              (r.sucursal_venta || "").toString() === filtroSucursalIntentos
          );

    const byDate: Record<
      string,
      {
        total: number;
        c1: number;
        c2: number;
        c3: number;
        c4: number;
        c6: number;
        cNull: number;
      }
    > = {};

    for (const it of filtered) {
      const rec = it as Record<string, unknown>;
      const fecha = String(
        (rec["fecha_creacion_date"] as string | undefined) ||
          (rec["fecha_creacion"] as string | undefined) ||
          ""
      );
      if (!fecha) continue;
      if (!byDate[fecha]) {
        byDate[fecha] = {
          total: 0,
          c1: 0,
          c2: 0,
          c3: 0,
          c4: 0,
          c6: 0,
          cNull: 0,
        };
      }
      byDate[fecha].total += 1;
      const vRaw = rec["conteo_intentos"] as unknown;
      const vNum =
        vRaw === null || vRaw === undefined
          ? null
          : typeof vRaw === "number"
          ? vRaw
          : Number(vRaw as string);
      if (vNum === null || Number.isNaN(vNum)) {
        byDate[fecha].cNull += 1;
      } else if (vNum === 1) {
        byDate[fecha].c1 += 1;
      } else if (vNum === 2) {
        byDate[fecha].c2 += 1;
      } else if (vNum === 3) {
        byDate[fecha].c3 += 1;
      } else if (vNum === 4) {
        byDate[fecha].c4 += 1;
      } else if (vNum === 6) {
        byDate[fecha].c6 += 1;
      }
    }

    const rows: IntentosRow[] = Object.keys(byDate)
      .sort()
      .map((fecha) => {
        const d = byDate[fecha];
        const total = Math.max(1, d.total);
        const pct = (n: number) => (n / total) * 100;
        return {
          fecha,
          c1: d.c1,
          p1: pct(d.c1),
          c2: d.c2,
          p2: pct(d.c2),
          c3: d.c3,
          p3: pct(d.c3),
          c4: d.c4,
          p4: pct(d.c4),
          c6: d.c6,
          p6: pct(d.c6),
          cNull: d.cNull,
          pNull: pct(d.cNull),
          total: d.total,
          pTotal: 100,
        };
      });
    return rows;
  }, [USE_FAKE_METRICAS, intentosAll, filtroSucursalIntentos]);
  const intentosTotalsFiltrados = useMemo(() => {
    if (USE_FAKE_METRICAS) return null;
    const src = intentosRowsFiltrados ?? [];
    return src.reduce(
      (acc, r) => {
        acc.total += r.total;
        acc.c1 += r.c1;
        acc.c2 += r.c2;
        acc.c3 += r.c3;
        acc.c4 += r.c4;
        acc.c6 += r.c6;
        acc.cNull += r.cNull;
        return acc;
      },
      { total: 0, c1: 0, c2: 0, c3: 0, c4: 0, c6: 0, cNull: 0 }
    );
  }, [USE_FAKE_METRICAS, intentosRowsFiltrados]);
  const [promedioError, setPromedioError] = useState<string | null>(null);
  type PromedioRow = {
    fecha: string;
    a1: number | null;
    a2: number | null;
    a3: number | null;
    a4: number | null;
    a6: number | null;
    aNull: null; // explícitamente null
    total: number | null;
  };
  const [promedioRows, setPromedioRows] = useState<PromedioRow[]>([]);
  const [promedioTotals, setPromedioTotals] = useState<{
    a1: number | null;
    a2: number | null;
    a3: number | null;
    a4: number | null;
    a6: number | null;
    aNull: null;
    total: number | null;
  } | null>(null);

  // Columnas reordenables (drag & drop)
  type ColumnId =
    | "fechaUsuarioDigital"
    | "idUsuarioDigital"
    | "nombrePreferido"
    | "idContacto"
    | "correoApp"
    | "telefonoApp"
    | "motivoNoAfiliacionAsesor"
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
      id: "motivoNoAfiliacionAsesor",
      header: "MOTIVO ASESOR",
      widthClass: "w-[18%] min-w-[16rem]",
      sortable: true,
    },
    {
      id: "motivoNoAfiliacion",
      header: "MOTIVO IT",
      widthClass: "w-[22%] min-w-[18rem]",
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
  // Estado/modal para Motivo Asesor
  const [isModalAsesorOpen, setIsModalAsesorOpen] = useState(false);
  const [motivoNoAfiliacionAsesorInput, setMotivoNoAfiliacionAsesorInput] =
    useState("");

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
  }, [fechaInicioA, fechaFinA]);

  // Abrir detalle filtrado por fecha y bucket de intentos
  const openIntentosDetail = useCallback(
    (fecha: string, bucket: 1 | 2 | 3 | 4 | 6 | "null") => {
      try {
        const subset = intentosAll.filter((it) => {
          const rec = it as Record<string, unknown>;
          const f = String(
            (rec["fecha_creacion_date"] as string | undefined) ||
              (rec["fecha_creacion"] as string | undefined) ||
              ""
          );
          if (f !== fecha) return false;
          const vRaw = rec["conteo_intentos"] as unknown;
          const vNum =
            vRaw === null || vRaw === undefined
              ? null
              : typeof vRaw === "number"
              ? vRaw
              : Number(vRaw as string);

          if (bucket === "null") return vNum === null || Number.isNaN(vNum);
          return vNum === bucket;
        });
        // Extraer los id_usuario_digital para filtrar las fotos de tienda
        const ids = Array.from(
          new Set(
            subset
              .map((it) => {
                const rec = it as Record<string, unknown>;
                const raw = rec["id_usuario_digital"];
                return raw == null ? null : String(raw as number | string);
              })
              .filter((v) => v && String(v).trim() !== "")
          )
        ) as string[];
        setFotosUserIdsFilter(ids);
        // Alinear el rango de fechas del reporte de Fotos con la fecha seleccionada
        setFechaInicioFotos(fecha);
        setFechaFinFotos(fecha);
        // Cambiar a vista de métricas y tab de fotosTienda
        setActiveView("metricas");
        setMetricasTab("fotosTienda");
        // Limpiar cualquier detalle previo
        setIntentosDetail(null);
        setIntentosDetailTitle("");
        setIntentosDetailKeys([]);
      } catch {
        // Ignorar error y establecer estado vacío
        setIntentosDetail([]);
        setIntentosDetailTitle("Detalle");
        setIntentosDetailKeys([]);
      }
    },
    [intentosAll]
  );

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
            motivoNoAfiliacionAsesor: usuario.motivoNoAfiliacionAsesor ?? null,
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

  // Fetch Reporte Global
  const fetchReporteGlobal = useCallback(async () => {
    try {
      setGlobalIsLoading(true);
      setGlobalError(null);
      const url = new URL(
        `${API_BASE}/v1/afiliamiento/reporte-global-afiliaciones`
      );
      url.searchParams.set("page", String(globalPage));
      url.searchParams.set("limit", String(globalLimit));
      const resp = await fetch(url.toString(), { cache: "no-store" });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const json = await resp.json();
      const ok = Boolean(json?.success);
      if (!ok) throw new Error(String(json?.message || json?.error || "Error"));
      const items = Array.isArray(json?.data?.items) ? json.data.items : [];
      const pagination = json?.data?.pagination || null;
      setGlobalItems(items as ReporteGlobalItem[]);
      setGlobalPagination(pagination as Pagination);
      if (items && items.length > 0) {
        try {
          const keys = Object.keys(items[0] as Record<string, unknown>);
          setGlobalKeys(keys);
        } catch {
          setGlobalKeys([]);
        }
      } else {
        setGlobalKeys([]);
      }
    } catch (err) {
      console.error("Error reporte global:", err);
      setGlobalItems([]);
      setGlobalPagination(null);
      setGlobalError("No se pudo cargar el reporte global");
    } finally {
      setGlobalIsLoading(false);
    }
  }, [globalPage, globalLimit]);

  // Cargar cuando se entra a la vista global o cambia paginación
  useEffect(() => {
    if (activeView === "global") {
      fetchReporteGlobal();
    }
  }, [activeView, fetchReporteGlobal]);

  // Cargar todas las páginas y calcular métricas de INTENTOS
  const loadIntentosMetrics = useCallback(async () => {
    try {
      setShowGlobalIntentos(true);
      setIntentosIsLoading(true);
      setIntentosError(null);

      // Cargar datos crudos del endpoint interno y normalizar (métricas por id_usuario_digital por fecha)
      const params = new URLSearchParams();
      if (fechaInicioA) params.set("fechaInicio", fechaInicioA);
      if (fechaFinA) params.set("fechaFin", fechaFinA);
      const resp = await fetch(
        `/api/afiliaciones-por-intentos?${params.toString()}`,
        { cache: "no-store" }
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const raw: unknown[] = Array.isArray(json?.data) ? json.data : [];

      // Deduplicar por (fecha_creacion, id_usuario_digital)
      type Normalizado = {
        fecha_creacion: string;
        sucursal_venta: string | null;
        conteo_intentos: number | null;
        minutos: number | null; // tiempo_total_proceso_minutos
        id_usuario_digital: number;
        nombre_preferido: string | null;
      };
      const byKey = new Map<string, Normalizado>();
      for (const it of raw) {
        const r = it as Record<string, unknown>;
        const fecha = String((r["fecha_creacion"] as string) || "");
        if (!fecha) continue;
        const id = r["id_usuario_digital"];
        if (id === null || id === undefined) continue;
        // Agrupar únicamente por id_usuario_digital (ignorar otros campos para unicidad)
        const key = String(id);

        const reintRaw = r["cantidad_reintentos"] as unknown;
        const reintNum =
          reintRaw === null || reintRaw === undefined
            ? null
            : typeof reintRaw === "number"
            ? reintRaw
            : Number(reintRaw as string);
        let conteo: number | null;
        if (reintNum === null || Number.isNaN(reintNum)) {
          conteo = null; // Sin Intento (cantidad_reintentos null)
        } else {
          // Usar cantidad_reintentos tal cual (sin tope); columnas son dinámicas
          conteo = reintNum;
        }
        const suc = (r["sucursal_venta"] as string | null) ?? null;
        const minRaw = r["tiempo_total_proceso_minutos"] as unknown;
        const minutos =
          minRaw === null || minRaw === undefined
            ? null
            : typeof minRaw === "number"
            ? minRaw
            : Number(minRaw as string);
        const nombrePreferido =
          (r["nombre_preferido"] as string | null) ?? null;

        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, {
            fecha_creacion: fecha,
            sucursal_venta: suc,
            conteo_intentos: conteo,
            minutos,
            id_usuario_digital: Number(id),
            nombre_preferido: nombrePreferido,
          });
        } else {
          // Completar sucursal si estaba vacía y preferir bucket mayor si difiere
          if (!prev.sucursal_venta && suc) prev.sucursal_venta = suc;
          // Conservar una única fecha; si difieren, mantener la existente (o elegir la más reciente)
          // Aquí mantenemos la primera encontrada para estabilidad
          if (
            conteo !== null &&
            (prev.conteo_intentos === null ||
              (typeof prev.conteo_intentos === "number" &&
                conteo > prev.conteo_intentos))
          ) {
            prev.conteo_intentos = conteo;
          }
          if (prev.minutos == null && minutos != null) {
            prev.minutos = minutos;
          }
          if (!prev.nombre_preferido && nombrePreferido) {
            prev.nombre_preferido = nombrePreferido;
          }
        }
      }
      const filteredAll = Array.from(
        byKey.values()
      ) as unknown as ReporteGlobalItem[];

      // Agrupar por fecha_creacion y contar buckets (1,2,3,4,6 y Sin Intento)
      const byDate: Record<
        string,
        {
          total: number;
          c1: number;
          c2: number;
          c3: number;
          c4: number;
          c6: number;
          cNull: number;
        }
      > = {};

      for (const it of filteredAll) {
        const rec = it as Record<string, unknown>;
        const fecha = String(
          (rec["fecha_creacion_date"] as string | undefined) ||
            (rec["fecha_creacion"] as string | undefined) ||
            ""
        );
        if (!fecha) continue;
        if (!byDate[fecha]) {
          byDate[fecha] = {
            total: 0,
            c1: 0,
            c2: 0,
            c3: 0,
            c4: 0,
            c6: 0,
            cNull: 0,
          };
        }
        byDate[fecha].total += 1;
        const vRaw = rec["conteo_intentos"] as unknown;
        const vNum =
          vRaw === null || vRaw === undefined
            ? null
            : typeof vRaw === "number"
            ? vRaw
            : Number(vRaw as string);
        if (vNum === null || Number.isNaN(vNum)) {
          byDate[fecha].cNull += 1;
        } else if (vNum === 1) {
          byDate[fecha].c1 += 1;
        } else if (vNum === 2) {
          byDate[fecha].c2 += 1;
        } else if (vNum === 3) {
          byDate[fecha].c3 += 1;
        } else if (vNum === 4) {
          byDate[fecha].c4 += 1;
        } else if (vNum === 6) {
          byDate[fecha].c6 += 1;
        } else {
          // Otros valores de intentos no solicitados: se contabilizan en total, no en columnas
        }
      }

      const rows: IntentosRow[] = Object.keys(byDate)
        .sort()
        .map((fecha) => {
          const d = byDate[fecha];
          const total = Math.max(1, d.total);
          const pct = (n: number) => (n / total) * 100;
          return {
            fecha,
            c1: d.c1,
            p1: pct(d.c1),
            c2: d.c2,
            p2: pct(d.c2),
            c3: d.c3,
            p3: pct(d.c3),
            c4: d.c4,
            p4: pct(d.c4),
            c6: d.c6,
            p6: pct(d.c6),
            cNull: d.cNull,
            pNull: pct(d.cNull),
            total: d.total,
            pTotal: 100,
          };
        });

      const totals = rows.reduce(
        (acc, r) => {
          acc.total += r.total;
          acc.c1 += r.c1;
          acc.c2 += r.c2;
          acc.c3 += r.c3;
          acc.c4 += r.c4;
          acc.c6 += r.c6;
          acc.cNull += r.cNull;
          return acc;
        },
        { total: 0, c1: 0, c2: 0, c3: 0, c4: 0, c6: 0, cNull: 0 }
      );

      setIntentosRows(rows);
      setIntentosTotals(totals);
      setIntentosAll(filteredAll);
      setIntentosDetail(null);
      setIntentosDetailTitle("");
      setIntentosDetailKeys([]);
    } catch (err) {
      console.error("Error métricas de intentos:", err);
      setIntentosRows([]);
      setIntentosTotals(null);
      setIntentosError("No se pudieron calcular las métricas de intentos");
    } finally {
      setIntentosIsLoading(false);
    }
  }, [fechaInicioA, fechaFinA]);

  // Cargar dataset para Tiempo Afiliación X Intento (independiente del anterior)
  const loadTiempoMetrics = useCallback(async () => {
    try {
      // Reutiliza el mismo service con rango independiente
      const params = new URLSearchParams();
      if (fechaInicioTiempo) params.set("fechaInicio", fechaInicioTiempo);
      if (fechaFinTiempo) params.set("fechaFin", fechaFinTiempo);
      const resp = await fetch(
        `/api/afiliaciones-por-intentos?${params.toString()}`,
        { cache: "no-store" }
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const raw: unknown[] = Array.isArray(json?.data) ? json.data : [];

      type Normalizado = {
        fecha_creacion: string;
        sucursal_venta: string | null;
        conteo_intentos: number | null;
        minutos: number | null;
      };
      const byKey = new Map<string, Normalizado>();
      for (const it of raw) {
        const r = it as Record<string, unknown>;
        const fecha = String((r["fecha_creacion"] as string) || "");
        if (!fecha) continue;
        const id = r["id_usuario_digital"];
        if (id === null || id === undefined) continue;
        const key = String(id);

        const reintRaw = r["cantidad_reintentos"] as unknown;
        const reintNum =
          reintRaw === null || reintRaw === undefined
            ? null
            : typeof reintRaw === "number"
            ? reintRaw
            : Number(reintRaw as string);
        const minRaw = r["tiempo_total_proceso_minutos"] as unknown;
        const minutos =
          minRaw === null || minRaw === undefined
            ? null
            : typeof minRaw === "number"
            ? minRaw
            : Number(minRaw as string);
        const suc = (r["sucursal_venta"] as string | null) ?? null;

        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, {
            fecha_creacion: fecha,
            sucursal_venta: suc,
            conteo_intentos:
              reintNum === null || Number.isNaN(reintNum) ? null : reintNum,
            minutos,
          });
        } else {
          if (!prev.sucursal_venta && suc) prev.sucursal_venta = suc;
          // Mantener el mayor bucket si difiere
          if (
            reintNum !== null &&
            !Number.isNaN(reintNum) &&
            (prev.conteo_intentos === null ||
              (typeof prev.conteo_intentos === "number" &&
                reintNum > prev.conteo_intentos))
          ) {
            prev.conteo_intentos = reintNum;
          }
          if (prev.minutos == null && minutos != null) {
            prev.minutos = minutos;
          }
        }
      }
      const normalized = Array.from(
        byKey.values()
      ) as unknown as ReporteGlobalItem[];
      setTiempoAll(normalized);
    } catch (e) {
      // En errores, dejar dataset vacío para evitar inconsistencia
      setTiempoAll([]);
    }
  }, [fechaInicioTiempo, fechaFinTiempo]);

  // Efecto: cargar tiempo cuando se entra al tab correspondiente
  useEffect(() => {
    if (USE_FAKE_METRICAS) return;
    if (
      activeView === "metricas" &&
      metricasTab === "tiempoAfiliacionIntento"
    ) {
      loadTiempoMetrics();
    }
  }, [
    USE_FAKE_METRICAS,
    activeView,
    metricasTab,
    fechaInicioTiempo,
    fechaFinTiempo,
    loadTiempoMetrics,
  ]);

  // Cargar datos de Afiliación X Intentos al entrar al tab de Métricas (una sola vez por entrada)
  useEffect(() => {
    if (USE_FAKE_METRICAS) return;
    if (activeView === "metricas" && metricasTab === "afiliacionIntentos") {
      if (!intentosLoadedRef.current) {
        intentosLoadedRef.current = true;
        loadIntentosMetrics();
      }
    } else {
      // Resetear la marca al salir del tab para permitir recarga cuando se vuelva a entrar
      intentosLoadedRef.current = false;
    }
  }, [USE_FAKE_METRICAS, activeView, metricasTab, loadIntentosMetrics]);

  // Reconsultar cuando cambian las fechas seleccionadas en Afiliación X Intentos
  useEffect(() => {
    if (USE_FAKE_METRICAS) return;
    if (activeView === "metricas" && metricasTab === "afiliacionIntentos") {
      loadIntentosMetrics();
    }
  }, [
    USE_FAKE_METRICAS,
    activeView,
    metricasTab,
    fechaInicioA,
    fechaFinA,
    loadIntentosMetrics,
  ]);
  // Cargar promedio de minutos por intento (APP)
  const loadPromedioMinutos = useCallback(async () => {
    try {
      setShowGlobalPromedio(true);
      setShowGlobalIntentos(false);
      setPromedioIsLoading(true);
      setPromedioError(null);

      const all: ReporteGlobalItem[] = [];
      {
        const url = new URL(
          `${API_BASE}/v1/afiliamiento/reporte-global-afiliaciones`
        );
        url.searchParams.set("page", "1");
        url.searchParams.set("limit", "100000");
        const resp = await fetch(url.toString(), { cache: "no-store" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const items = Array.isArray(json?.data?.items) ? json.data.items : [];
        for (const it of items) all.push(it as ReporteGlobalItem);
      }

      type Bucket = 1 | 2 | 3 | 4 | 6;
      type Stats = { sum: number; count: number };
      const makeStats = (): Stats => ({ sum: 0, count: 0 });

      const byDate: Record<
        string,
        {
          b1: Stats;
          b2: Stats;
          b3: Stats;
          b4: Stats;
          b6: Stats; // null no acumula
          total: Stats;
        }
      > = {};

      const totals: { [K in Bucket]: Stats } & { total: Stats } = {
        1: makeStats(),
        2: makeStats(),
        3: makeStats(),
        4: makeStats(),
        6: makeStats(),
        total: makeStats(),
      } as { [K in Bucket]: Stats } & { total: Stats };

      for (const it of all) {
        const rec = it as Record<string, unknown>;
        const originUpper = String(rec["origen_creacion"] ?? "").toUpperCase();
        if (originUpper !== "APP") continue;

        const fecha = String(
          (rec["fecha_creacion_date"] as string | undefined) ||
            (rec["fecha_creacion"] as string | undefined) ||
            ""
        );
        if (!fecha) continue;

        const minutesRaw = rec[
          "tiempo_enrolamiento_completo_en_minutos"
        ] as unknown;
        const minutes =
          typeof minutesRaw === "number"
            ? minutesRaw
            : Number(minutesRaw as string);
        if (Number.isNaN(minutes)) continue;

        if (!byDate[fecha]) {
          byDate[fecha] = {
            b1: makeStats(),
            b2: makeStats(),
            b3: makeStats(),
            b4: makeStats(),
            b6: makeStats(),
            total: makeStats(),
          };
        }

        byDate[fecha].total.sum += minutes;
        byDate[fecha].total.count += 1;
        totals.total.sum += minutes;
        totals.total.count += 1;

        const vRaw = rec["conteo_intentos"] as unknown;
        const vNum =
          vRaw === null || vRaw === undefined
            ? null
            : typeof vRaw === "number"
            ? vRaw
            : Number(vRaw as string);
        if (
          vNum === 1 ||
          vNum === 2 ||
          vNum === 3 ||
          vNum === 4 ||
          vNum === 6
        ) {
          const key = ("b" + vNum) as keyof (typeof byDate)[typeof fecha];
          (byDate[fecha][key] as Stats).sum += minutes;
          (byDate[fecha][key] as Stats).count += 1;
          (totals[vNum as Bucket] as Stats).sum += minutes;
          (totals[vNum as Bucket] as Stats).count += 1;
        }
        // si es null u otro valor, no se promedia por bucket
      }

      const rows: PromedioRow[] = Object.keys(byDate)
        .sort()
        .map((fecha) => {
          const d = byDate[fecha];
          const avg = (s: Stats): number | null =>
            s.count > 0 ? s.sum / s.count : null;
          return {
            fecha,
            a1: avg(d.b1),
            a2: avg(d.b2),
            a3: avg(d.b3),
            a4: avg(d.b4),
            a6: avg(d.b6),
            aNull: null,
            total: avg(d.total),
          };
        });

      const avgTotals = (s: Stats): number | null =>
        s.count > 0 ? s.sum / s.count : null;
      setPromedioTotals({
        a1: avgTotals(totals[1]),
        a2: avgTotals(totals[2]),
        a3: avgTotals(totals[3]),
        a4: avgTotals(totals[4]),
        a6: avgTotals(totals[6]),
        aNull: null,
        total: avgTotals(totals.total),
      });
      setPromedioRows(rows);
    } catch (err) {
      console.error("Error promedio minutos por intento:", err);
      setPromedioRows([]);
      setPromedioTotals(null);
      setPromedioError("No se pudo calcular el promedio de minutos");
    } finally {
      setPromedioIsLoading(false);
    }
  }, []);

  // Cargar Fotos Tienda (hook) y efectos
  const loadFotosTienda = useCallback(async () => {
    try {
      setFotosIsLoading(true);
      setFotosError(null);
      const params = new URLSearchParams();
      if (fechaInicioFotos) params.set("fechaInicio", fechaInicioFotos);
      if (fechaFinFotos) params.set("fechaFin", fechaFinFotos);
      const resp = await fetch(`/api/afiliaciones-fotos?${params.toString()}`, {
        cache: "no-store",
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const data = Array.isArray(json?.data) ? json.data : [];
      const mapped: FotoItem[] = (data as Partial<FotoItem>[]).map((r) => ({
        id: (r?.id as number) ?? String(r?.id ?? ""),
        nombre_preferido: (r?.nombre_preferido as string) ?? null,
        sucursal_venta: (r?.sucursal_venta as string) ?? null,
        asesor_venta: (r?.asesor_venta as string) ?? null,
        url_imagen_frontal: (r?.url_imagen_frontal as string) ?? null,
        url_imagen_trasera: (r?.url_imagen_trasera as string) ?? null,
        url_imagen_selfie: (r?.url_imagen_selfie as string) ?? null,
        id_contacto: (r?.id_contacto as number) ?? null,
        id_usuario_digital: (r?.id_usuario_digital as string) ?? null,
        tuvo_conflicto: (r?.tuvo_conflicto as boolean) ?? false,
        intentos: (r?.intentos as Intento[] | null) ?? null,
      }));
      setFotosItems(mapped);
    } catch (e) {
      setFotosItems([]);
      setFotosError("No se pudieron cargar las fotos");
    } finally {
      setFotosIsLoading(false);
    }
  }, [fechaInicioFotos, fechaFinFotos]);

  useEffect(() => {
    if (USE_FAKE_METRICAS) return;
    if (activeView === "metricas" && metricasTab === "fotosTienda") {
      loadFotosTienda();
    }
  }, [
    USE_FAKE_METRICAS,
    activeView,
    metricasTab,
    fechaInicioFotos,
    fechaFinFotos,
    loadFotosTienda,
  ]);

  // Cargar datos para Afiliaciones X Intentos Nuevos
  const loadAfiliacionesNuevos = useCallback(async () => {
    try {
      setAfiliacionesNuevosIsLoading(true);
      setAfiliacionesNuevosError(null);
      const params = new URLSearchParams();
      if (fechaInicioAfiliacionesNuevos)
        params.set("fechaInicio", fechaInicioAfiliacionesNuevos);
      if (fechaFinAfiliacionesNuevos)
        params.set("fechaFin", fechaFinAfiliacionesNuevos);
      const resp = await fetch(
        `/api/metricas-intentos-nuevo?${params.toString()}`,
        {
          cache: "no-store",
        }
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const data = Array.isArray(json?.data) ? json.data : [];

      const mapped: AfiliacionNuevaItem[] = (
        data as Partial<AfiliacionNuevaItem>[]
      ).map((r) => ({
        idUsuarioDigital: (r?.idUsuarioDigital as number) ?? 0,
        fecha_creacion: (r?.fecha_creacion as string) ?? "",
        cantidadIntentos: (r?.cantidadIntentos as number) ?? 0,
        cantCorreccionFrontal: (r?.cantCorreccionFrontal as number) ?? 0,
        cantCorreccionTrasera: (r?.cantCorreccionTrasera as number) ?? 0,
        cantCorreccionSelfie: (r?.cantCorreccionSelfie as number) ?? 0,
      }));
      setAfiliacionesNuevosItems(mapped);
    } catch (e) {
      setAfiliacionesNuevosItems([]);
      setAfiliacionesNuevosError(
        "No se pudieron cargar las afiliaciones nuevas"
      );
    } finally {
      setAfiliacionesNuevosIsLoading(false);
    }
  }, [fechaInicioAfiliacionesNuevos, fechaFinAfiliacionesNuevos]);

  useEffect(() => {
    if (USE_FAKE_METRICAS) return;
    if (activeView === "metricas" && metricasTab === "afiliacionesNuevos") {
      loadAfiliacionesNuevos();
    }
  }, [
    USE_FAKE_METRICAS,
    activeView,
    metricasTab,
    fechaInicioAfiliacionesNuevos,
    fechaFinAfiliacionesNuevos,
    loadAfiliacionesNuevos,
  ]);

  // Cerrar vista ampliada con Escape
  useEffect(() => {
    if (!imagePreviewUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImagePreviewUrl(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [imagePreviewUrl]);

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
    } else if (activeView === "reintentos") {
      // Forzar explícitamente el refetch de reintentos incluso si ya era hoy
      setReintentosRefreshKey((k) => k + 1);
    }
  };

  // Limpiar filtros de Fotos Tienda
  const clearFotosFilters = () => {
    const today = getTodayDate();
    setFechaInicioFotos(today);
    setFechaFinFotos(today);
    setFiltroSucursalFotos("");
    setFiltroAfiliacionFotos("");
    setFiltroConflictoFotos("");
    setFotosSearch("");
    setFotosUserIdsFilter([]);
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
      const idUsuario = (c.idUsuarioDigital || "").toLowerCase();
      const motivoDirecto = (c.motivoNoAfiliacion || "").toLowerCase();
      const motivoMapa = (
        motivosNoAfiliacion[c.idUsuarioDigital || ""] || ""
      ).toLowerCase();
      return (
        idUsuario.includes(q) ||
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
    setMotivoNoAfiliacionAsesorInput(user.motivoNoAfiliacionAsesor || "");
    setIsModalAsesorOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setMotivoNoAfiliacion("");
  };

  // Abrir modal de Motivo IT desde la celda
  const handleOpenItModal = (user: UsuarioDigitalUI) => {
    setSelectedUser(user);
    const existingMotivo =
      motivosNoAfiliacion[user.idUsuarioDigital || ""] ||
      user.motivoNoAfiliacion ||
      "";
    setMotivoNoAfiliacion(existingMotivo);
    setIsModalOpen(true);
  };

  // Abrir/cerrar modal de Motivo Asesor
  const handleOpenAsesorModal = (user: UsuarioDigitalUI) => {
    setSelectedUser(user);
    setMotivoNoAfiliacionAsesorInput(user.motivoNoAfiliacionAsesor || "");
    setIsModalAsesorOpen(true);
  };

  const handleCloseAsesorModal = () => {
    setIsModalAsesorOpen(false);
    setSelectedUser(null);
    setMotivoNoAfiliacionAsesorInput("");
  };

  const handleSaveMotivo = async () => {
    const userId = selectedUser?.idUsuarioDigital;
    if (!userId) return;
    const motivoIt =
      motivoNoAfiliacion.trim() === "" ? null : motivoNoAfiliacion.trim();
    try {
      const response = await fetch("/api/motivos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idUsuarioDigital: userId,
          motivoNoAfiliacion: motivoIt,
          motivoNoAfiliacionAsesor: null,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Error al guardar");

      setMotivosNoAfiliacion((prev) => ({
        ...prev,
        [userId]: motivoIt ?? "",
      }));

      setClientes((prev) =>
        prev.map((u) =>
          u.idUsuarioDigital === userId
            ? { ...u, motivoNoAfiliacion: motivoIt }
            : u
        )
      );

      alert(
        `✅ Motivo IT ${motivoIt ? "guardado" : "limpiado"} para ${
          selectedUser?.nombrePreferido || selectedUser?.idUsuarioDigital
        }`
      );
      handleCloseModal();
    } catch (error) {
      console.error("❌ Error guardando en BD, usando estado local:", error);
      setMotivosNoAfiliacion((prev) => ({
        ...prev,
        [userId]: motivoIt ?? "",
      }));
      setClientes((prev) =>
        prev.map((u) =>
          u.idUsuarioDigital === userId
            ? { ...u, motivoNoAfiliacion: motivoIt }
            : u
        )
      );
      alert(
        `⚠️ Motivo IT ${
          motivoIt ? "guardado localmente" : "limpiado localmente"
        } para ${
          selectedUser?.nombrePreferido || selectedUser?.idUsuarioDigital
        }\n(No se pudo guardar en BD)`
      );
      handleCloseModal();
    }
  };

  const handleSaveMotivoAsesor = async () => {
    const userId = selectedUser?.idUsuarioDigital;
    if (!userId) return;
    const motivoAsesor =
      motivoNoAfiliacionAsesorInput.trim() === ""
        ? null
        : motivoNoAfiliacionAsesorInput.trim();
    try {
      const response = await fetch("/api/motivos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idUsuarioDigital: userId,
          motivoNoAfiliacion: null,
          motivoNoAfiliacionAsesor: motivoAsesor,
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Error al guardar");

      setClientes((prev) =>
        prev.map((u) =>
          u.idUsuarioDigital === userId
            ? { ...u, motivoNoAfiliacionAsesor: motivoAsesor }
            : u
        )
      );
      alert(
        `✅ Motivo Asesor ${motivoAsesor ? "guardado" : "limpiado"} para ${
          selectedUser?.nombrePreferido || selectedUser?.idUsuarioDigital
        }`
      );
      handleCloseAsesorModal();
    } catch (error) {
      console.error("❌ Error guardando en BD, usando estado local:", error);
      setClientes((prev) =>
        prev.map((u) =>
          u.idUsuarioDigital === userId
            ? { ...u, motivoNoAfiliacionAsesor: motivoAsesor }
            : u
        )
      );
      alert(
        `⚠️ Motivo Asesor ${
          motivoAsesor ? "guardado localmente" : "limpiado localmente"
        } para ${
          selectedUser?.nombrePreferido || selectedUser?.idUsuarioDigital
        }\n(No se pudo guardar en BD)`
      );
      handleCloseAsesorModal();
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
                Buscar (ID usuario, teléfono, preferido, correo, contacto,
                identificación, motivo)
              </label>
              <input
                type="text"
                id="searchQuery"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ej: UD123, 9876, maria, @gmail.com, juan perez, 0501..., sin documento"
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
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  onClick={() => setActiveView("global")}
                  className="h-9 px-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 transition-colors"
                  title="Ver Reporte Global"
                >
                  Reporte Global
                </button>
                <button
                  onClick={() => setActiveView("metricas")}
                  className="h-9 px-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 transition-colors"
                  title="Ver Reporte Métricas"
                >
                  REPORTE METRICAS
                </button>
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
        {activeView === "metricas" ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMetricasTab("afiliacionIntentos")}
                    className={`px-3 py-1.5 text-xs ${
                      metricasTab === "afiliacionIntentos"
                        ? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                    title="Afiliación por intentos"
                  >
                    Afiliación X Intentos
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricasTab("tiempoAfiliacionIntento")}
                    className={`px-3 py-1.5 text-xs ${
                      metricasTab === "tiempoAfiliacionIntento"
                        ? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                    title="Tiempo de afiliación por intento"
                  >
                    Tiempo Afiliación X Intento
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricasTab("proveedores")}
                    className={`px-3 py-1.5 text-xs ${
                      metricasTab === "proveedores"
                        ? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                    title="Métricas por proveedores"
                  >
                    Proveedores
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricasTab("fotosTienda")}
                    className={`px-3 py-1.5 text-xs ${
                      metricasTab === "fotosTienda"
                        ? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                    title="Fotos Tienda"
                  >
                    Fotos Tienda
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricasTab("afiliacionesNuevos")}
                    className={`px-3 py-1.5 text-xs ${
                      metricasTab === "afiliacionesNuevos"
                        ? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                    title="Afiliaciones X Intentos Nuevos"
                  >
                    Afiliaciones X Intentos Nuevos
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {metricasTab === "afiliacionIntentos" && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Afiliación X Intentos
                  </h3>

                  <div className="mt-3 flex items-end gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Sucursal
                      </label>
                      <select
                        value={filtroSucursalIntentos}
                        onChange={(e) =>
                          setFiltroSucursalIntentos(e.target.value)
                        }
                        className="h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      >
                        <option value="">Todas</option>
                        <option value="__NULL__">Sin Sucursal</option>
                        {sucursalesIntentos.map((s: string) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Inicio
                      </label>
                      <input
                        type="date"
                        value={fechaInicioA}
                        onChange={(e) => setFechaInicioA(e.target.value)}
                        className="h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Fin
                      </label>
                      <input
                        type="date"
                        value={fechaFinA}
                        onChange={(e) => setFechaFinA(e.target.value)}
                        className="h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      />
                    </div>
                    <div className="pt-5">
                      <button
                        type="button"
                        onClick={() => {
                          intentosLoadedRef.current = true;
                          loadIntentosMetrics();
                        }}
                        className="h-9 px-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors"
                        title="Buscar métricas con los filtros seleccionados"
                      >
                        Buscar
                      </button>
                    </div>
                  </div>

                  {intentosError && !USE_FAKE_METRICAS && (
                    <div className="mt-3 p-3 text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                      {intentosError}
                    </div>
                  )}

                  {intentosIsLoading && !USE_FAKE_METRICAS ? (
                    <div className="mt-6 flex items-center justify-center text-gray-600 dark:text-gray-300">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                      Cargando métricas...
                    </div>
                  ) : (
                    <div className="mt-4 flex items-start gap-3">
                      <div className="overflow-x-auto">
                        <table className="table-auto w-auto text-sm border border-gray-200 dark:border-gray-700 border-collapse">
                          <thead className="bg-[#6885a7]">
                            <tr>
                              <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                Fecha/hora
                              </th>
                              {intentosDynamic.buckets.map((b) => (
                                <>
                                  <th
                                    key={`h-b-${b}`}
                                    className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"
                                  >
                                    {b === 1 || b === 0 ? b : b - 1}{" "}
                                    {b === 1
                                      ? "Intento"
                                      : b === 0
                                      ? "Sin Intento"
                                      : "Correcciones"}
                                  </th>
                                  <th
                                    key={`h-bpct-${b}`}
                                    className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"
                                  ></th>
                                </>
                              ))}
                              {intentosDynamic.hasNull && (
                                <>
                                  <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                    Sin Intento
                                  </th>
                                  <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"></th>
                                </>
                              )}
                              <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                Suma Total
                              </th>
                              <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"></th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {(() => {
                              // Render dinámico real
                              if (!USE_FAKE_METRICAS) {
                                const dynRows = intentosDynamic.rows;
                                if (dynRows.length === 0) {
                                  return (
                                    <tr>
                                      <td
                                        colSpan={
                                          2 +
                                          intentosDynamic.buckets.length * 2 +
                                          (intentosDynamic.hasNull ? 2 : 0)
                                        }
                                        className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                                      >
                                        Sin datos para mostrar
                                      </td>
                                    </tr>
                                  );
                                }
                                return dynRows.map((r, idx) => (
                                  <tr
                                    key={idx}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    <td className="px-2 py-1 text-sm font-mono text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-[#dbe0e6] text-gray-900">
                                      {r.fecha}
                                    </td>
                                    {intentosDynamic.buckets.map((b) => {
                                      const v =
                                        (r.counts &&
                                          (r.counts as Record<number, number>)[
                                            b
                                          ]) ||
                                        0;
                                      const t = r.total || 0;
                                      const pct = t > 0 ? (v / t) * 100 : 0;
                                      return (
                                        <>
                                          <td
                                            key={`c-${idx}-${b}`}
                                            className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"
                                          >
                                            {v > 0 ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  openIntentosDetail(
                                                    r.fecha,
                                                    b as 1 | 2 | 3 | 4 | 6
                                                  )
                                                }
                                                className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                                                title={`Ver detalle de ${v} registros (${b} intento${
                                                  b === 1 ? "" : "s"
                                                })`}
                                              >
                                                {v}
                                              </button>
                                            ) : (
                                              v
                                            )}
                                          </td>
                                          <td
                                            key={`cp-${idx}-${b}`}
                                            className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"
                                          >
                                            {`${pct.toFixed(2)}%`}
                                          </td>
                                        </>
                                      );
                                    })}
                                    {intentosDynamic.hasNull && (
                                      <>
                                        <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                          {r.nullCount > 0 ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                openIntentosDetail(
                                                  r.fecha,
                                                  "null"
                                                )
                                              }
                                              className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                                              title={`Ver detalle de ${r.nullCount} registros (intentos null)`}
                                            >
                                              {r.nullCount}
                                            </button>
                                          ) : (
                                            r.nullCount
                                          )}
                                        </td>
                                        <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                          {(() => {
                                            const t = r.total || 0;
                                            const v = r.nullCount || 0;
                                            const pct =
                                              t > 0 ? (v / t) * 100 : 0;
                                            return `${pct.toFixed(2)}%`;
                                          })()}
                                        </td>
                                      </>
                                    )}
                                    <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {r.total}
                                    </td>
                                    <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      100%
                                    </td>
                                  </tr>
                                ));
                              }

                              // Fallback: datos falsos (modo demo)
                              const rows: IntentosRow[] = USE_FAKE_METRICAS
                                ? (() => {
                                    const base = [
                                      {
                                        fecha: "2025-11-01",
                                        c1: 10,
                                        c2: 7,
                                        c3: 5,
                                        cNull: 2,
                                        total: 24,
                                      },
                                      {
                                        fecha: "2025-11-02",
                                        c1: 8,
                                        c2: null as unknown as number,
                                        c3: 3,
                                        cNull: 1,
                                        total: 18,
                                      },
                                      {
                                        fecha: "2025-11-03",
                                        c1: 12,
                                        c2: 9,
                                        c3: 4,
                                        cNull: 3,
                                        total: 28,
                                      },
                                      {
                                        fecha: "2025-11-04",
                                        c1: 7,
                                        c2: 5,
                                        c3: null as unknown as number,
                                        cNull: 2,
                                        total: 16,
                                      },
                                      {
                                        fecha: "2025-11-05",
                                        c1: 15,
                                        c2: 11,
                                        c3: 6,
                                        cNull: 4,
                                        total: 36,
                                      },
                                      {
                                        fecha: "2025-11-06",
                                        c1: 9,
                                        c2: 7,
                                        c3: 3,
                                        cNull: null as unknown as number,
                                        total: 21,
                                      },
                                      {
                                        fecha: "2025-11-07",
                                        c1: 11,
                                        c2: 8,
                                        c3: 5,
                                        cNull: 1,
                                        total: 25,
                                      },
                                      {
                                        fecha: "2025-11-08",
                                        c1: 5,
                                        c2: null as unknown as number,
                                        c3: null as unknown as number,
                                        cNull: null as unknown as number,
                                        total: 5,
                                      },
                                    ] as Array<{
                                      fecha: string;
                                      c1: number;
                                      c2: number | null;
                                      c3: number | null;
                                      cNull: number | null;
                                      total: number;
                                    }>;
                                    return base.map((b) => {
                                      const c2 = b.c2 ?? 0;
                                      const c3 = b.c3 ?? 0;
                                      const cNull = b.cNull ?? 0;
                                      const total = Math.max(1, b.total);
                                      const pct = (n: number) =>
                                        (n / total) * 100;
                                      const row: IntentosRow = {
                                        fecha: b.fecha,
                                        c1: b.c1,
                                        p1: pct(b.c1),
                                        c2,
                                        p2: pct(c2),
                                        c3,
                                        p3: pct(c3),
                                        c4: 0,
                                        p4: 0,
                                        c6: 0,
                                        p6: 0,
                                        cNull,
                                        pNull: pct(cNull),
                                        total: b.total,
                                        pTotal: 100,
                                      };
                                      return row;
                                    });
                                  })()
                                : intentosRowsFiltrados &&
                                  intentosRowsFiltrados.length > 0
                                ? intentosRowsFiltrados
                                : intentosRows;
                              const filteredRowsA = rows.filter((r) => {
                                const d = r.fecha;
                                if (fechaInicioA && d < fechaInicioA)
                                  return false;
                                if (fechaFinA && d > fechaFinA) return false;
                                return true;
                              });
                              if (filteredRowsA.length === 0) {
                                return (
                                  <tr>
                                    <td
                                      colSpan={11}
                                      className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                                    >
                                      Sin datos para mostrar
                                    </td>
                                  </tr>
                                );
                              }
                              return filteredRowsA.map((r, idx) => (
                                <tr
                                  key={idx}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <td className="px-2 py-1 text-sm font-mono text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-[#dbe0e6] text-gray-900">
                                    {r.fecha}
                                  </td>
                                  <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                    {r.c1}
                                  </td>
                                  <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                    {(() => {
                                      const t = r.total || 0;
                                      const pct = t > 0 ? (r.c1 / t) * 100 : 0;
                                      return `${pct.toFixed(2)}%`;
                                    })()}
                                  </td>
                                  <td
                                    className={`px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 ${
                                      r.c2 == null
                                        ? "bg-gray-200 dark:bg-gray-700"
                                        : ""
                                    }`}
                                  >
                                    {r.c2}
                                  </td>
                                  <td
                                    className={`px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 ${
                                      r.c2 == null
                                        ? "bg-gray-200 dark:bg-gray-700"
                                        : ""
                                    }`}
                                  >
                                    {(() => {
                                      const t = r.total || 0;
                                      const v = r.c2 ?? 0;
                                      const pct = t > 0 ? (v / t) * 100 : 0;
                                      return `${pct.toFixed(2)}%`;
                                    })()}
                                  </td>
                                  <td
                                    className={`px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 ${
                                      r.c3 == null
                                        ? "bg-gray-200 dark:bg-gray-700"
                                        : ""
                                    }`}
                                  >
                                    {r.c3}
                                  </td>
                                  <td
                                    className={`px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 ${
                                      r.c3 == null
                                        ? "bg-gray-200 dark:bg-gray-700"
                                        : ""
                                    }`}
                                  >
                                    {(() => {
                                      const t = r.total || 0;
                                      const v = r.c3 ?? 0;
                                      const pct = t > 0 ? (v / t) * 100 : 0;
                                      return `${pct.toFixed(2)}%`;
                                    })()}
                                  </td>
                                  <td
                                    className={`px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 ${
                                      r.cNull == null
                                        ? "bg-gray-200 dark:bg-gray-700"
                                        : ""
                                    }`}
                                  >
                                    {r.cNull}
                                  </td>
                                  <td
                                    className={`px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 ${
                                      r.cNull == null
                                        ? "bg-gray-200 dark:bg-gray-700"
                                        : ""
                                    }`}
                                  >
                                    {(() => {
                                      const t = r.total || 0;
                                      const v = r.cNull ?? 0;
                                      const pct = t > 0 ? (v / t) * 100 : 0;
                                      return `${pct.toFixed(2)}%`;
                                    })()}
                                  </td>
                                  <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                    {r.total}
                                  </td>
                                  <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                    {(() => {
                                      const t = r.total || 0;
                                      const pct = t > 0 ? 100 : 0;
                                      return `${pct.toFixed(2)}%`;
                                    })()}
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                          <tfoot className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap border border-gray-200 dark:border-gray-700">
                                SUMA TOTAL
                              </th>
                              {(() => {
                                if (!USE_FAKE_METRICAS) {
                                  const totalsByBucket =
                                    intentosDynamic.buckets.reduce((acc, b) => {
                                      acc[b] = intentosDynamic.rows.reduce(
                                        (sum, r) =>
                                          sum +
                                          ((r.counts &&
                                            (
                                              r.counts as Record<number, number>
                                            )[b]) ||
                                            0),
                                        0
                                      );
                                      return acc;
                                    }, {} as Record<number, number>);
                                  const totalAll = intentosDynamic.rows.reduce(
                                    (sum, r) => sum + (r.total || 0),
                                    0
                                  );
                                  const nullTotal = intentosDynamic.rows.reduce(
                                    (sum, r) => sum + (r.nullCount || 0),
                                    0
                                  );
                                  const pct = (n: number) =>
                                    `${
                                      totalAll > 0
                                        ? ((n / totalAll) * 100).toFixed(2)
                                        : "0.00"
                                    }%`;
                                  return (
                                    <>
                                      {intentosDynamic.buckets.map((b) => (
                                        <>
                                          <th
                                            key={`ft-b-${b}`}
                                            className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"
                                          >
                                            {totalsByBucket[b] || 0}
                                          </th>
                                          <th
                                            key={`ft-bpct-${b}`}
                                            className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"
                                          >
                                            {pct(totalsByBucket[b] || 0)}
                                          </th>
                                        </>
                                      ))}
                                      {intentosDynamic.hasNull && (
                                        <>
                                          <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                            {nullTotal}
                                          </th>
                                          <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                            {pct(nullTotal)}
                                          </th>
                                        </>
                                      )}
                                      <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                        {totalAll}
                                      </th>
                                      <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                        100%
                                      </th>
                                    </>
                                  );
                                }
                                // Modo fake: mantener estructura básica
                                return (
                                  <>
                                    <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      0
                                    </th>
                                    <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      0.00%
                                    </th>
                                    <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      0
                                    </th>
                                    <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      0.00%
                                    </th>
                                    <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      0
                                    </th>
                                    <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      0.00%
                                    </th>
                                    <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      0
                                    </th>
                                    <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      0.00%
                                    </th>
                                  </>
                                );
                              })()}
                            </tr>
                          </tfoot>
                        </table>
                        {intentosDetail && (
                          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                            <div className="mb-2 flex items-center justify-between">
                              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                {intentosDetailTitle}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setIntentosDetail(null);
                                  setIntentosDetailTitle("");
                                  setIntentosDetailKeys([]);
                                }}
                                className="px-3 py-1.5 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
                              >
                                Cerrar detalle
                              </button>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                  <tr>
                                    {intentosDetailKeys.length > 0 ? (
                                      intentosDetailKeys.map((k) => (
                                        <th
                                          key={k}
                                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                        >
                                          {k}
                                        </th>
                                      ))
                                    ) : (
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        (sin columnas)
                                      </th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                  {intentosDetail.map((it, i) => (
                                    <tr
                                      key={i}
                                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                      {intentosDetailKeys.map((k) => (
                                        <td
                                          key={k}
                                          className="px-3 py-2 text-xs align-top"
                                        >
                                          {(() => {
                                            const val = (
                                              it as Record<string, unknown>
                                            )[k];
                                            if (val == null) return "-";
                                            if (typeof val === "object") {
                                              try {
                                                const json =
                                                  JSON.stringify(val);
                                                return (
                                                  <span
                                                    title={json}
                                                    className="font-mono"
                                                  >
                                                    {json}
                                                  </span>
                                                );
                                              } catch {
                                                return String(val);
                                              }
                                            }
                                            return String(val);
                                          })()}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setShowCompareIntentos((prev) => !prev)
                          }
                          className="h-9 px-3 text-xs font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 transition-colors"
                          title="Comparar con versión anterior"
                        >
                          Comparar Version Anterior
                        </button>
                      </div>
                      {showCompareIntentos && (
                        <div className="overflow-x-auto">
                          <div className="mb-2 flex items-end gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                                Inicio
                              </label>
                              <input
                                type="date"
                                value={fechaInicioB}
                                onChange={(e) =>
                                  setFechaInicioB(e.target.value)
                                }
                                className="h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                                Fin
                              </label>
                              <input
                                type="date"
                                value={fechaFinB}
                                onChange={(e) => setFechaFinB(e.target.value)}
                                className="h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                              />
                            </div>
                          </div>
                          <table className="table-auto w-auto text-sm border border-gray-200 dark:border-gray-700 border-collapse">
                            <thead className="bg-[#6885a7]">
                              <tr>
                                <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  Fecha/hora
                                </th>
                                <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  1 Intento
                                </th>
                                <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"></th>
                                <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  2 Intentos
                                </th>
                                <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"></th>
                                <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  3 Intentos
                                </th>
                                <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"></th>
                                <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  Sin Intento
                                </th>
                                <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"></th>
                                <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  Suma Total
                                </th>
                                <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"></th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {(() => {
                                const rows = USE_FAKE_METRICAS
                                  ? [
                                      {
                                        fecha: "2025-10-25",
                                        c1: 9,
                                        c2: 6,
                                        c3: 4,
                                        cNull: 3,
                                        total: 22,
                                      },
                                      {
                                        fecha: "2025-10-26",
                                        c1: 7,
                                        c2: 5,
                                        c3: 2,
                                        cNull: 2,
                                        total: 16,
                                      },
                                      {
                                        fecha: "2025-10-27",
                                        c1: 10,
                                        c2: 8,
                                        c3: 3,
                                        cNull: 1,
                                        total: 22,
                                      },
                                    ]
                                  : intentosRows;
                                const filteredRowsB = rows.filter((r) => {
                                  const d = r.fecha;
                                  if (fechaInicioB && d < fechaInicioB)
                                    return false;
                                  if (fechaFinB && d > fechaFinB) return false;
                                  return true;
                                });
                                if (filteredRowsB.length === 0) {
                                  return (
                                    <tr>
                                      <td
                                        colSpan={11}
                                        className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                                      >
                                        Sin datos para mostrar
                                      </td>
                                    </tr>
                                  );
                                }
                                return filteredRowsB.map((r, idx) => (
                                  <tr
                                    key={idx}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    <td className="px-2 py-1 text-sm font-mono text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-[#dbe0e6] text-gray-900">
                                      {r.fecha}
                                    </td>
                                    <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {r.c1}
                                    </td>
                                    <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {(() => {
                                        const t = r.total || 0;
                                        const pct =
                                          t > 0 ? (r.c1 / t) * 100 : 0;
                                        return `${pct.toFixed(2)}%`;
                                      })()}
                                    </td>
                                    <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {r.c2}
                                    </td>
                                    <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {(() => {
                                        const t = r.total || 0;
                                        const v = r.c2 ?? 0;
                                        const pct = t > 0 ? (v / t) * 100 : 0;
                                        return `${pct.toFixed(2)}%`;
                                      })()}
                                    </td>
                                    <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {r.c3}
                                    </td>
                                    <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {(() => {
                                        const t = r.total || 0;
                                        const v = r.c3 ?? 0;
                                        const pct = t > 0 ? (v / t) * 100 : 0;
                                        return `${pct.toFixed(2)}%`;
                                      })()}
                                    </td>
                                    <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {r.cNull}
                                    </td>
                                    <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {(() => {
                                        const t = r.total || 0;
                                        const v = r.cNull ?? 0;
                                        const pct = t > 0 ? (v / t) * 100 : 0;
                                        return `${pct.toFixed(2)}%`;
                                      })()}
                                    </td>
                                    <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {r.total}
                                    </td>
                                    <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {(() => {
                                        const t = r.total || 0;
                                        const pct = t > 0 ? 100 : 0;
                                        return `${pct.toFixed(2)}%`;
                                      })()}
                                    </td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                            <tfoot className="bg-gray-50 dark:bg-gray-700">
                              <tr>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap border border-gray-200 dark:border-gray-700">
                                  SUMA TOTAL
                                </th>
                                {(() => {
                                  // Recalcular totales con el rango de fechas aplicado
                                  const rowsForTotals = (() => {
                                    const base = USE_FAKE_METRICAS
                                      ? [
                                          {
                                            fecha: "2025-10-25",
                                            c1: 9,
                                            c2: 6,
                                            c3: 4,
                                            cNull: 3,
                                            total: 22,
                                          },
                                          {
                                            fecha: "2025-10-26",
                                            c1: 7,
                                            c2: 5,
                                            c3: 2,
                                            cNull: 2,
                                            total: 16,
                                          },
                                          {
                                            fecha: "2025-10-27",
                                            c1: 10,
                                            c2: 8,
                                            c3: 3,
                                            cNull: 1,
                                            total: 22,
                                          },
                                        ]
                                      : intentosRows;
                                    return base.filter((r) => {
                                      const d = r.fecha;
                                      if (fechaInicioB && d < fechaInicioB)
                                        return false;
                                      if (fechaFinB && d > fechaFinB)
                                        return false;
                                      return true;
                                    });
                                  })();
                                  const totals = rowsForTotals.reduce(
                                    (acc, r) => {
                                      acc.c1 += r.c1;
                                      acc.c2 += r.c2;
                                      acc.c3 += r.c3;
                                      acc.cNull += r.cNull;
                                      acc.total += r.total;
                                      return acc;
                                    },
                                    { c1: 0, c2: 0, c3: 0, cNull: 0, total: 0 }
                                  );
                                  return (
                                    <>
                                      <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                        {totals?.c1 ?? 0}
                                      </th>
                                      <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                        {(() => {
                                          const t = totals?.total || 0;
                                          const pct =
                                            t > 0
                                              ? ((totals?.c1 || 0) / t) * 100
                                              : 0;
                                          return `${pct.toFixed(2)}%`;
                                        })()}
                                      </th>
                                      <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                        {totals?.c2 ?? 0}
                                      </th>
                                      <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                        {(() => {
                                          const t = totals?.total || 0;
                                          const pct =
                                            t > 0
                                              ? ((totals?.c2 || 0) / t) * 100
                                              : 0;
                                          return `${pct.toFixed(2)}%`;
                                        })()}
                                      </th>
                                      <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                        {totals?.c3 ?? 0}
                                      </th>
                                      <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                        {(() => {
                                          const t = totals?.total || 0;
                                          const pct =
                                            t > 0
                                              ? ((totals?.c3 || 0) / t) * 100
                                              : 0;
                                          return `${pct.toFixed(2)}%`;
                                        })()}
                                      </th>
                                      <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                        {totals?.cNull ?? 0}
                                      </th>
                                      <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                        {(() => {
                                          const t = totals?.total || 0;
                                          const pct =
                                            t > 0
                                              ? ((totals?.cNull || 0) / t) * 100
                                              : 0;
                                          return `${pct.toFixed(2)}%`;
                                        })()}
                                      </th>
                                      <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                        {totals?.total ?? 0}
                                      </th>
                                      <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                        {(() => {
                                          const t = totals?.total || 0;
                                          const pct = t > 0 ? 100 : 0;
                                          return `${pct.toFixed(2)}%`;
                                        })()}
                                      </th>
                                    </>
                                  );
                                })()}
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {metricasTab === "tiempoAfiliacionIntento" && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Tiempo Afiliación X Intento
                  </h3>

                  <div className="mt-3 flex items-end gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-100 mb-1">
                        Sucursal
                      </label>
                      <select
                        value={filtroSucursalTiempo}
                        onChange={(e) =>
                          setFiltroSucursalTiempo(e.target.value)
                        }
                        className="h-10 w-64 px-3 text-base border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      >
                        <option value="">Todas</option>
                        <option value="__NULL__">Sin Sucursal</option>
                        {sucursalesIntentos.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Inicio
                      </label>
                      <input
                        type="date"
                        value={fechaInicioTiempo}
                        onChange={(e) => setFechaInicioTiempo(e.target.value)}
                        className="h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Fin
                      </label>
                      <input
                        type="date"
                        value={fechaFinTiempo}
                        onChange={(e) => setFechaFinTiempo(e.target.value)}
                        className="h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      />
                    </div>
                    <div className="pt-5">
                      <button
                        type="button"
                        onClick={() => {
                          loadTiempoMetrics();
                        }}
                        className="h-9 px-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors"
                        title="Buscar promedios con los filtros seleccionados"
                      >
                        Buscar
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-start gap-3">
                    <div className="overflow-x-auto">
                      <table className="table-auto w-auto text-sm border border-gray-200 dark:border-gray-700 border-collapse">
                        <thead className="bg-[#6885a7]">
                          <tr>
                            <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                              Fecha
                            </th>
                            {tiempoDynamic.buckets.map((b) => (
                              <th
                                key={`th-t-${b}`}
                                className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"
                              >
                                {b === 1 || b === 0 ? b : b - 1}{" "}
                                {b === 1
                                  ? "Intento (avg)"
                                  : b === 0
                                  ? "Sin Intento (avg)"
                                  : "Correcciones (avg)"}
                              </th>
                            ))}
                            {tiempoDynamic.hasNull && (
                              <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                Sin Intento (avg)
                              </th>
                            )}
                            <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                              Promedio Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {tiempoDynamic.rows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={
                                  2 +
                                  tiempoDynamic.buckets.length +
                                  (tiempoDynamic.hasNull ? 1 : 0)
                                }
                                className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                              >
                                Sin datos para mostrar
                              </td>
                            </tr>
                          ) : (
                            tiempoDynamic.rows.map(({ fecha, agg }, idx) => (
                              <tr
                                key={`trow-${idx}`}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <td className="px-2 py-1 text-sm font-mono text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-[#dbe0e6] text-gray-900">
                                  {fecha}
                                </td>
                                {tiempoDynamic.buckets.map((b) => {
                                  const a = agg.buckets[b];
                                  const avg =
                                    a && a.count > 0 ? a.sum / a.count : null;
                                  return (
                                    <td
                                      key={`tcell-${idx}-${b}`}
                                      className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"
                                    >
                                      {avg == null ? "-" : avg.toFixed(2)}
                                    </td>
                                  );
                                })}
                                {tiempoDynamic.hasNull && (
                                  <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                    {agg.nullAgg.count > 0
                                      ? (
                                          agg.nullAgg.sum / agg.nullAgg.count
                                        ).toFixed(2)
                                      : "-"}
                                  </td>
                                )}
                                <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  {agg.total.count > 0
                                    ? (agg.total.sum / agg.total.count).toFixed(
                                        2
                                      )
                                    : "-"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap border border-gray-200 dark:border-gray-700">
                              PROMEDIO TOTAL
                            </th>
                            {(() => {
                              // promedio global por bucket (ponderado por count)
                              const totalsByBucket =
                                tiempoDynamic.buckets.reduce((acc, b) => {
                                  let sum = 0;
                                  let count = 0;
                                  for (const r of tiempoDynamic.rows) {
                                    const a = r.agg.buckets[b];
                                    if (a && a.count > 0) {
                                      sum += a.sum;
                                      count += a.count;
                                    }
                                  }
                                  acc[b] =
                                    count > 0 ? (sum / count).toFixed(2) : "-";
                                  return acc;
                                }, {} as Record<number, string | "-">);
                              const nullAvg = (() => {
                                if (!tiempoDynamic.hasNull) return "-";
                                let sum = 0;
                                let count = 0;
                                for (const r of tiempoDynamic.rows) {
                                  sum += r.agg.nullAgg.sum;
                                  count += r.agg.nullAgg.count;
                                }
                                return count > 0
                                  ? (sum / count).toFixed(2)
                                  : "-";
                              })();
                              const totalAvg = (() => {
                                let sum = 0;
                                let count = 0;
                                for (const r of tiempoDynamic.rows) {
                                  sum += r.agg.total.sum;
                                  count += r.agg.total.count;
                                }
                                return count > 0
                                  ? (sum / count).toFixed(2)
                                  : "-";
                              })();
                              return (
                                <>
                                  {tiempoDynamic.buckets.map((b) => (
                                    <th
                                      key={`tft-${b}`}
                                      className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700"
                                    >
                                      {totalsByBucket[b]}
                                    </th>
                                  ))}
                                  {tiempoDynamic.hasNull && (
                                    <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {nullAvg}
                                    </th>
                                  )}
                                  <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                    {totalAvg}
                                  </th>
                                </>
                              );
                            })()}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowCompareMinutos((prev) => !prev)}
                        className="h-9 px-3 text-xs font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 transition-colors"
                        title="Comparar con versión anterior"
                      >
                        Comparar Version Anterior
                      </button>
                    </div>
                    {showCompareMinutos && (
                      <div className="overflow-x-auto">
                        <table className="table-auto w-auto text-sm border border-gray-200 dark:border-gray-700 border-collapse">
                          <thead className="bg-[#6885a7]">
                            <tr>
                              <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                Fecha
                              </th>
                              <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                1 Intento
                              </th>
                              <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                2 Intentos
                              </th>
                              <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                3 Intentos
                              </th>
                              <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                Suma Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {(() => {
                              const rows = USE_FAKE_METRICAS
                                ? [
                                    {
                                      fecha: "2025-10-25",
                                      c1: 1.05,
                                      c2: 0.92,
                                      c3: 0.58,
                                      total: 1.05 + 0.92 + 0.58,
                                    },
                                    {
                                      fecha: "2025-10-26",
                                      c1: 0.88,
                                      c2: 0.74,
                                      c3: 0.49,
                                      total: 0.88 + 0.74 + 0.49,
                                    },
                                    {
                                      fecha: "2025-10-27",
                                      c1: 1.12,
                                      c2: 0.97,
                                      c3: 0.61,
                                      total: 1.12 + 0.97 + 0.61,
                                    },
                                  ]
                                : [];
                              if (rows.length === 0) {
                                return (
                                  <tr>
                                    <td
                                      colSpan={5}
                                      className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                                    >
                                      Sin datos para mostrar
                                    </td>
                                  </tr>
                                );
                              }
                              return rows.map((r, idx) => (
                                <tr
                                  key={idx}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <td className="px-2 py-1 text-sm font-mono text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-[#dbe0e6] text-gray-900">
                                    {r.fecha}
                                  </td>
                                  <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                    {r.c1.toFixed(2)}
                                  </td>
                                  <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                    {r.c2.toFixed(2)}
                                  </td>
                                  <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                    {r.c3.toFixed(2)}
                                  </td>
                                  <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                    {(r.total as number).toFixed(2)}
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                          <tfoot className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap border border-gray-200 dark:border-gray-700">
                                SUMA TOTAL
                              </th>
                              {(() => {
                                const rows = USE_FAKE_METRICAS
                                  ? [
                                      {
                                        c1: 1.05,
                                        c2: 0.92,
                                        c3: 0.58,
                                        total: 1.05 + 0.92 + 0.58,
                                      },
                                      {
                                        c1: 0.88,
                                        c2: 0.74,
                                        c3: 0.49,
                                        total: 0.88 + 0.74 + 0.49,
                                      },
                                      {
                                        c1: 1.12,
                                        c2: 0.97,
                                        c3: 0.61,
                                        total: 1.12 + 0.97 + 0.61,
                                      },
                                    ]
                                  : [];
                                const totals = rows.reduce(
                                  (acc, r) => {
                                    acc.c1 += r.c1;
                                    acc.c2 += r.c2;
                                    acc.c3 += r.c3;
                                    acc.total += r.total;
                                    return acc;
                                  },
                                  { c1: 0, c2: 0, c3: 0, total: 0 }
                                );
                                return (
                                  <>
                                    <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {totals.c1.toFixed(2)}
                                    </th>
                                    <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {totals.c2.toFixed(2)}
                                    </th>
                                    <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {totals.c3.toFixed(2)}
                                    </th>
                                    <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {totals.total.toFixed(2)}
                                    </th>
                                  </>
                                );
                              })()}
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {metricasTab === "fotosTienda" && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Fotos Tienda
                  </h3>

                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Sucursal
                      </label>
                      <select
                        value={filtroSucursalFotos}
                        onChange={(e) => setFiltroSucursalFotos(e.target.value)}
                        className="h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      >
                        <option value="">Todas</option>
                        <option value="__NULL__">Sin Sucursal</option>
                        {sucursalesFotos.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Afiliación
                      </label>
                      <select
                        value={filtroAfiliacionFotos}
                        onChange={(e) =>
                          setFiltroAfiliacionFotos(e.target.value)
                        }
                        className="h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      >
                        <option value="">Todos</option>
                        <option value="AFILIADO">AFILIADO</option>
                        <option value="NO-AFILIADO">NO-AFILIADO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Conflicto
                      </label>
                      <select
                        value={filtroConflictoFotos}
                        onChange={(e) =>
                          setFiltroConflictoFotos(e.target.value)
                        }
                        className="h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      >
                        <option value="">Todos</option>
                        <option value="CON-CONFLICTO">CON-CONFLICTO</option>
                        <option value="SIN-CONFLICTO">SIN-CONFLICTO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Inicio
                      </label>
                      <input
                        type="date"
                        value={fechaInicioFotos}
                        onChange={(e) => setFechaInicioFotos(e.target.value)}
                        className="h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Fin
                      </label>
                      <input
                        type="date"
                        value={fechaFinFotos}
                        onChange={(e) => setFechaFinFotos(e.target.value)}
                        className="h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      />
                    </div>
                    <div className="pt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={loadFotosTienda}
                        className="h-9 px-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors"
                        title="Buscar fotos del rango"
                      >
                        Buscar
                      </button>
                      <button
                        type="button"
                        onClick={clearFotosFilters}
                        className="h-9 px-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 transition-colors"
                        title="Limpiar todos los filtros"
                      >
                        Limpiar filtro
                      </button>
                    </div>
                    <div className="ml-auto">
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Buscar
                      </label>
                      <input
                        type="text"
                        placeholder="Nombre, asesor o sucursal"
                        value={fotosSearch}
                        onChange={(e) => setFotosSearch(e.target.value)}
                        className="h-9 w-60 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Área de visualización de fotos */}
                  {fotosIsLoading ? (
                    <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
                      <p className="text-lg">Cargando fotos...</p>
                    </div>
                  ) : fotosFiltrados.length === 0 ? (
                    <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
                      <p className="text-lg">Área de visualización de fotos</p>
                      <p className="text-sm mt-2">
                        Aquí se mostrarán las fotos después de hacer búsquedas
                      </p>
                    </div>
                  ) : (
                    <div className="mt-8">
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-max">
                        {fotosFiltrados.map((usuario) => (
                          <div
                            key={String(usuario.id_usuario_digital)}
                            className="group rounded-lg border-2 border-transparent bg-white dark:bg-gray-800 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:border-blue-500 dark:hover:border-blue-400"
                          >
                            {/* Header decorativo del usuario */}
                            <div className="bg-gradient-to-135 from-blue-600 via-blue-700 to-indigo-700 dark:from-blue-600 dark:via-blue-700 dark:to-indigo-800 px-4 py-3 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-16 h-16 bg-white/15 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-300" />
                              <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/10 rounded-full -ml-6 -mb-6" />

                              <div className="relative z-10">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <h2 className="text-sm font-bold text-white leading-tight group-hover:text-blue-50 transition-colors truncate">
                                      {usuario.nombre_preferido ||
                                        `Usuario ${usuario.id_usuario_digital}`}
                                    </h2>
                                    <p className="text-blue-200 text-xs mt-0.5 opacity-95 font-medium">
                                      ID: {usuario.id_usuario_digital}
                                    </p>
                                  </div>
                                  <div className="bg-white/30 backdrop-blur-sm px-2 py-1 rounded-full whitespace-nowrap">
                                    <span className="text-white text-xs font-bold">
                                      {usuario.intentos?.length || 0}
                                    </span>
                                  </div>
                                </div>

                                {/* Badges de información */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {usuario.sucursal_venta && (
                                    <div className="bg-white/35 backdrop-blur-sm px-2 py-0.5 rounded text-white text-xs font-semibold">
                                      📍 {usuario.sucursal_venta}
                                    </div>
                                  )}
                                  {usuario.asesor_venta && (
                                    <div className="bg-white/35 backdrop-blur-sm px-2 py-0.5 rounded text-white text-xs font-semibold">
                                      👤 {usuario.asesor_venta}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Contenedor de intentos */}
                            <div className="p-3">
                              {usuario.intentos &&
                              usuario.intentos.length > 0 ? (
                                <div className="space-y-3">
                                  {usuario.intentos.map(
                                    (intento, intentoIdx) => (
                                      <div
                                        key={intento.idIntento || intentoIdx}
                                        className="bg-gray-50 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 p-3 hover:shadow-md transition-shadow"
                                      >
                                        {/* Badge del intento */}
                                        <div className="mb-3 flex items-center gap-2">
                                          <div
                                            className={`w-1.5 h-5 rounded-full ${
                                              intentoIdx === 0
                                                ? "bg-green-600"
                                                : "bg-amber-600"
                                            }`}
                                          />
                                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                                            {intentoIdx === 0
                                              ? `✨ Inicial (${intento.idIntento})`
                                              : `🔄 Correc. ${intentoIdx} (${intento.idIntento})`}
                                          </span>
                                        </div>

                                        {/* Grid de fotos */}
                                        {intento.imagenes &&
                                        Array.isArray(intento.imagenes) &&
                                        intento.imagenes.length > 0 ? (
                                          <div className="grid grid-cols-3 gap-2">
                                            {intento.imagenes.map(
                                              (imagen, imgIdx) => {
                                                const tipoTexto: Record<
                                                  number,
                                                  string
                                                > = {
                                                  1: "Front",
                                                  2: "Tras",
                                                  3: "Self",
                                                };
                                                const tipoEmoji: Record<
                                                  number,
                                                  string
                                                > = {
                                                  1: "📷",
                                                  2: "📸",
                                                  3: "🤳",
                                                };
                                                const tipo =
                                                  tipoTexto[
                                                    imagen.idTipoImagen || 0
                                                  ] || "Img";
                                                const emoji =
                                                  tipoEmoji[
                                                    imagen.idTipoImagen || 0
                                                  ] || "📷";

                                                return (
                                                  <div
                                                    key={imgIdx}
                                                    className="flex flex-col group/img"
                                                  >
                                                    <div className="mb-1 text-xs font-bold text-gray-900 dark:text-white flex items-center gap-0.5">
                                                      <span>{emoji}</span>
                                                      <span className="hidden sm:inline">
                                                        {tipo}
                                                      </span>
                                                    </div>
                                                    <div className="aspect-square bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-800 dark:to-gray-900 rounded overflow-hidden border-2 border-gray-400 dark:border-gray-600 shadow-sm hover:shadow-md transition-all group-hover/img:border-blue-500 dark:group-hover/img:border-blue-400 group-hover/img:scale-110">
                                                      {imagen.imagen ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                          src={imagen.imagen}
                                                          alt={tipo}
                                                          className="w-full h-full object-cover cursor-zoom-in hover:opacity-95 transition-opacity"
                                                          onClick={() =>
                                                            setImagePreviewUrl(
                                                              imagen.imagen as string
                                                            )
                                                          }
                                                        />
                                                      ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 dark:text-gray-400 font-bold">
                                                          —
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              }
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-center py-2 text-gray-600 dark:text-gray-400 text-xs font-medium">
                                            ⚠️ Sin fotos
                                          </div>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                                  <p className="text-lg">📭</p>
                                  <p className="text-xs font-medium mt-1">
                                    Sin intentos
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Modal de vista ampliada de imagen */}
              {imagePreviewUrl && (
                <div
                  className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
                  onClick={() => setImagePreviewUrl(null)}
                >
                  <div
                    className="max-w-5xl max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreviewUrl}
                      alt="Vista ampliada"
                      className="max-h-[90vh] max-w-[90vw] object-contain rounded-md shadow-2xl"
                    />
                  </div>
                </div>
              )}
              {metricasTab === "proveedores" && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Proveedores
                  </h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="table-auto w-auto text-sm border border-gray-200 dark:border-gray-700 border-collapse">
                      <thead className="bg-[#6885a7]">
                        <tr>
                          <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                            Fecha
                          </th>
                          <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                            Microsoft
                          </th>
                          <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                            %
                          </th>
                          <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                            Facebook
                          </th>
                          <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                            %
                          </th>
                          <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                            Apple
                          </th>
                          <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                            %
                          </th>
                          <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                            Credencial
                          </th>
                          <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                            %
                          </th>
                          <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                            Suma Total
                          </th>
                          <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                            %
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {(() => {
                          const rows = USE_FAKE_METRICAS
                            ? [
                                {
                                  fecha: "2025-11-01",
                                  microsoft: 12,
                                  facebook: 8,
                                  apple: 5,
                                  credencial: 2,
                                },
                                {
                                  fecha: "2025-11-02",
                                  microsoft: 9,
                                  facebook: 6,
                                  apple: 3,
                                  credencial: 1,
                                },
                                {
                                  fecha: "2025-11-03",
                                  microsoft: 11,
                                  facebook: 7,
                                  apple: 4,
                                  credencial: 3,
                                },
                                {
                                  fecha: "2025-11-04",
                                  microsoft: 7,
                                  facebook: 5,
                                  apple: 2,
                                  credencial: 2,
                                },
                                {
                                  fecha: "2025-11-05",
                                  microsoft: 15,
                                  facebook: 11,
                                  apple: 6,
                                  credencial: 4,
                                },
                              ].map((r) => ({
                                ...r,
                                total:
                                  r.microsoft +
                                  r.facebook +
                                  r.apple +
                                  r.credencial,
                              }))
                            : [];
                          if (rows.length === 0) {
                            return (
                              <tr>
                                <td
                                  colSpan={11}
                                  className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                                >
                                  Sin datos para mostrar
                                </td>
                              </tr>
                            );
                          }
                          return rows.map((r, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <td className="px-2 py-1 text-sm font-mono text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-[#dbe0e6] text-gray-900">
                                {r.fecha}
                              </td>
                              <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                {r.microsoft}
                              </td>
                              <td className="px-2 py-1 text-xs text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                                {(() => {
                                  const t = r.total || 0;
                                  const pct =
                                    t > 0 ? (r.microsoft / t) * 100 : 0;
                                  return `${pct.toFixed(2)}%`;
                                })()}
                              </td>
                              <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                {r.facebook}
                              </td>
                              <td className="px-2 py-1 text-xs text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                                {(() => {
                                  const t = r.total || 0;
                                  const pct =
                                    t > 0 ? (r.facebook / t) * 100 : 0;
                                  return `${pct.toFixed(2)}%`;
                                })()}
                              </td>
                              <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                {r.apple}
                              </td>
                              <td className="px-2 py-1 text-xs text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                                {(() => {
                                  const t = r.total || 0;
                                  const pct = t > 0 ? (r.apple / t) * 100 : 0;
                                  return `${pct.toFixed(2)}%`;
                                })()}
                              </td>
                              <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                {r.credencial}
                              </td>
                              <td className="px-2 py-1 text-xs text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                                {(() => {
                                  const t = r.total || 0;
                                  const pct =
                                    t > 0 ? (r.credencial / t) * 100 : 0;
                                  return `${pct.toFixed(2)}%`;
                                })()}
                              </td>
                              <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                {r.total}
                              </td>
                              <td className="px-2 py-1 text-xs text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                                {(() => {
                                  const t = r.total || 0;
                                  const pct = t > 0 ? 100 : 0;
                                  return `${pct.toFixed(2)}%`;
                                })()}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap border border-gray-200 dark:border-gray-700">
                            SUMA TOTAL
                          </th>
                          {(() => {
                            const rows = USE_FAKE_METRICAS
                              ? [
                                  {
                                    microsoft: 12,
                                    facebook: 8,
                                    apple: 5,
                                    credencial: 2,
                                    total: 12 + 8 + 5 + 2,
                                  },
                                  {
                                    microsoft: 9,
                                    facebook: 6,
                                    apple: 3,
                                    credencial: 1,
                                    total: 9 + 6 + 3 + 1,
                                  },
                                  {
                                    microsoft: 11,
                                    facebook: 7,
                                    apple: 4,
                                    credencial: 3,
                                    total: 11 + 7 + 4 + 3,
                                  },
                                  {
                                    microsoft: 7,
                                    facebook: 5,
                                    apple: 2,
                                    credencial: 2,
                                    total: 7 + 5 + 2 + 2,
                                  },
                                  {
                                    microsoft: 15,
                                    facebook: 11,
                                    apple: 6,
                                    credencial: 4,
                                    total: 15 + 11 + 6 + 4,
                                  },
                                ]
                              : [];
                            const totals = rows.reduce(
                              (acc, r) => {
                                acc.microsoft += r.microsoft;
                                acc.facebook += r.facebook;
                                acc.apple += r.apple;
                                acc.credencial += r.credencial;
                                acc.total += r.total;
                                return acc;
                              },
                              {
                                microsoft: 0,
                                facebook: 0,
                                apple: 0,
                                credencial: 0,
                                total: 0,
                              }
                            );
                            return (
                              <>
                                <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  {totals.microsoft}
                                </th>
                                <th className="px-1 py-1 text-center text-[11px] font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  {(() => {
                                    const t = totals.total || 0;
                                    const pct =
                                      t > 0 ? (totals.microsoft / t) * 100 : 0;
                                    return `${pct.toFixed(2)}%`;
                                  })()}
                                </th>
                                <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  {totals.facebook}
                                </th>
                                <th className="px-1 py-1 text-center text-[11px] font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  {(() => {
                                    const t = totals.total || 0;
                                    const pct =
                                      t > 0 ? (totals.facebook / t) * 100 : 0;
                                    return `${pct.toFixed(2)}%`;
                                  })()}
                                </th>
                                <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  {totals.apple}
                                </th>
                                <th className="px-1 py-1 text-center text-[11px] font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  {(() => {
                                    const t = totals.total || 0;
                                    const pct =
                                      t > 0 ? (totals.apple / t) * 100 : 0;
                                    return `${pct.toFixed(2)}%`;
                                  })()}
                                </th>
                                <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  {totals.credencial}
                                </th>
                                <th className="px-1 py-1 text-center text-[11px] font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  {(() => {
                                    const t = totals.total || 0;
                                    const pct =
                                      t > 0 ? (totals.credencial / t) * 100 : 0;
                                    return `${pct.toFixed(2)}%`;
                                  })()}
                                </th>
                                <th className="px-1 py-1 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  {totals.total}
                                </th>
                                <th className="px-1 py-1 text-center text-[11px] font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  {(() => {
                                    const t = totals.total || 0;
                                    const pct = t > 0 ? 100 : 0;
                                    return `${pct.toFixed(2)}%`;
                                  })()}
                                </th>
                              </>
                            );
                          })()}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
              {metricasTab === "afiliacionesNuevos" && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Afiliaciones X Intentos Nuevos
                  </h3>

                  <div className="mt-3 flex items-end gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Inicio
                      </label>
                      <input
                        type="date"
                        value={fechaInicioAfiliacionesNuevos}
                        onChange={(e) =>
                          setFechaInicioAfiliacionesNuevos(e.target.value)
                        }
                        className="h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Fin
                      </label>
                      <input
                        type="date"
                        value={fechaFinAfiliacionesNuevos}
                        onChange={(e) =>
                          setFechaFinAfiliacionesNuevos(e.target.value)
                        }
                        className="h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      />
                    </div>
                    <div className="pt-5">
                      <button
                        type="button"
                        onClick={loadAfiliacionesNuevos}
                        className="h-9 px-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors"
                        title="Buscar afiliaciones nuevas"
                      >
                        Buscar
                      </button>
                    </div>
                  </div>

                  {afiliacionesNuevosError && (
                    <div className="mt-3 p-3 text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                      {afiliacionesNuevosError}
                    </div>
                  )}

                  {afiliacionesNuevosIsLoading ? (
                    <div className="mt-6 flex items-center justify-center text-gray-600 dark:text-gray-300">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                      Cargando afiliaciones...
                    </div>
                  ) : afiliacionesNuevosAgrupado.length === 0 ? (
                    <div className="mt-6 text-center text-gray-500 dark:text-gray-400">
                      Sin afiliaciones para mostrar
                    </div>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="table-auto w-auto text-sm border border-gray-200 dark:border-gray-700 border-collapse">
                        <thead className="bg-[#6885a7]">
                          <tr>
                            <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                              Fecha
                            </th>
                            {intentosUnicos.map((intento) => (
                              <React.Fragment key={intento}>
                                <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  {intento} Intento{intento !== 1 ? "s" : ""}
                                </th>
                                <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                  % {intento} Intento{intento !== 1 ? "s" : ""}
                                </th>
                              </React.Fragment>
                            ))}
                            <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                              Correcciones Frontal
                            </th>
                            <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                              % Frontal
                            </th>
                            <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                              Correcciones Trasera
                            </th>
                            <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                              % Trasera
                            </th>
                            <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                              Correcciones Selfie
                            </th>
                            <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                              % Selfie
                            </th>
                            <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                              Suma Total
                            </th>
                            <th className="px-2 py-2 text-center text-sm font-semibold text-white whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                              % del Total General
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {afiliacionesNuevosAgrupado.map((row, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <td className="px-2 py-1 text-sm font-mono text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-[#dbe0e6] text-gray-900">
                                {row.fecha}
                              </td>
                              {intentosUnicos.map((intento) => {
                                const count = row.intentosCounts[intento] || 0;
                                const percentage =
                                  row.total > 0
                                    ? ((count / row.total) * 100).toFixed(1)
                                    : "0";
                                return (
                                  <React.Fragment key={intento}>
                                    <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                      {count}
                                    </td>
                                    <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
                                      {percentage}%
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                              <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                {row.correccionesFrontal}
                              </td>
                              <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
                                {row.total > 0
                                  ? (
                                      (row.usuariosFrontal / row.total) *
                                      100
                                    ).toFixed(1)
                                  : "0"}
                                %
                              </td>
                              <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                {row.correccionesTrasera}
                              </td>
                              <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
                                {row.total > 0
                                  ? (
                                      (row.usuariosTrasera / row.total) *
                                      100
                                    ).toFixed(1)
                                  : "0"}
                                %
                              </td>
                              <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                {row.correccionesSelfie}
                              </td>
                              <td className="px-2 py-1 text-sm text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
                                {row.total > 0
                                  ? (
                                      (row.usuariosSelfie / row.total) *
                                      100
                                    ).toFixed(1)
                                  : "0"}
                                %
                              </td>
                              <td className="px-2 py-1 text-sm font-semibold text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                                {row.total}
                              </td>
                              <td className="px-2 py-1 text-sm font-semibold text-center whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                                {(() => {
                                  const totalSum =
                                    afiliacionesNuevosAgrupado.reduce(
                                      (sum, r) => sum + r.total,
                                      0
                                    );
                                  return totalSum > 0
                                    ? ((row.total / totalSum) * 100).toFixed(1)
                                    : "0";
                                })()}
                                %
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap border border-gray-200 dark:border-gray-700">
                              SUMA TOTAL
                            </th>
                            {intentosUnicos.map((intento) => {
                              const totalCount =
                                afiliacionesNuevosAgrupado.reduce(
                                  (sum, row) =>
                                    sum + (row.intentosCounts[intento] || 0),
                                  0
                                );
                              const totalUsuarios =
                                afiliacionesNuevosAgrupado.reduce(
                                  (sum, row) => sum + row.total,
                                  0
                                );
                              const percentage =
                                totalUsuarios > 0
                                  ? (
                                      (totalCount / totalUsuarios) *
                                      100
                                    ).toFixed(1)
                                  : "0";
                              return (
                                <React.Fragment key={intento}>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                                    {totalCount}
                                  </th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-yellow-700 dark:text-yellow-300 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
                                    {percentage}%
                                  </th>
                                </React.Fragment>
                              );
                            })}
                            <th className="px-2 py-2 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                              {afiliacionesNuevosAgrupado.reduce(
                                (sum, row) => sum + row.correccionesFrontal,
                                0
                              )}
                            </th>
                            <th className="px-2 py-2 text-center text-xs font-semibold text-yellow-700 dark:text-yellow-300 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
                              {(() => {
                                const totalUsuarios =
                                  afiliacionesNuevosAgrupado.reduce(
                                    (sum, row) => sum + row.total,
                                    0
                                  );
                                const usuariosTrasera =
                                  afiliacionesNuevosAgrupado.reduce(
                                    (sum, row) => sum + row.usuariosTrasera,
                                    0
                                  );
                                return totalUsuarios > 0
                                  ? (
                                      (usuariosTrasera / totalUsuarios) *
                                      100
                                    ).toFixed(1)
                                  : "0";
                              })()}
                              %
                            </th>
                            <th className="px-2 py-2 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                              {afiliacionesNuevosAgrupado.reduce(
                                (sum, row) => sum + row.correccionesTrasera,
                                0
                              )}
                            </th>
                            <th className="px-2 py-2 text-center text-xs font-semibold text-yellow-700 dark:text-yellow-300 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
                              {(() => {
                                const totalUsuarios =
                                  afiliacionesNuevosAgrupado.reduce(
                                    (sum, row) => sum + row.total,
                                    0
                                  );
                                const usuariosSelfie =
                                  afiliacionesNuevosAgrupado.reduce(
                                    (sum, row) => sum + row.usuariosSelfie,
                                    0
                                  );
                                return totalUsuarios > 0
                                  ? (
                                      (usuariosSelfie / totalUsuarios) *
                                      100
                                    ).toFixed(1)
                                  : "0";
                              })()}
                              %
                            </th>
                            <th className="px-2 py-2 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                              {afiliacionesNuevosAgrupado.reduce(
                                (sum, row) => sum + row.correccionesSelfie,
                                0
                              )}
                            </th>
                            <th className="px-2 py-2 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700">
                              {afiliacionesNuevosAgrupado.reduce(
                                (sum, row) => sum + row.total,
                                0
                              )}
                            </th>
                            <th className="px-2 py-2 text-center text-xs font-semibold text-green-700 dark:text-green-300 whitespace-nowrap w-0 min-w-0 border border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
                              100%
                            </th>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : activeView === "reintentos" ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <ReporteReintentos
              startDate={startDate}
              endDate={endDate}
              refreshKey={reintentosRefreshKey}
              filterUserIds={reintentosUserIdsFilter}
            />
          </div>
        ) : activeView === "global" ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 flex items-end gap-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                  Página
                </label>
                <input
                  type="number"
                  min={1}
                  value={globalPage}
                  onChange={(e) =>
                    setGlobalPage(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-24 h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                  Límite
                </label>
                <select
                  value={globalLimit}
                  onChange={(e) => setGlobalLimit(Number(e.target.value))}
                  className="w-28 h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
              </div>
              <button
                type="button"
                onClick={loadIntentosMetrics}
                className="h-9 px-3 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700 focus:ring-2 focus:ring-amber-500 transition-colors"
                title="Ver intentos"
              >
                INTENTOS
              </button>
              <button
                type="button"
                onClick={loadPromedioMinutos}
                className="h-9 px-3 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 transition-colors"
                title="Promedio minutos por intento"
              >
                PROMEDIO MINUTOS x INTENTO
              </button>
              <div className="ml-auto text-xs px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {globalIsLoading
                  ? "Cargando reporte..."
                  : `${globalItems.length} registros (página ${
                      globalPagination?.page ?? globalPage
                    } de ${globalPagination?.totalPages ?? "?"})`}
              </div>
            </div>
            {globalError && (
              <div className="p-4 text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
                {globalError}
              </div>
            )}
            {showGlobalIntentos ? (
              <div className="overflow-x-auto">
                {intentosError && (
                  <div className="p-4 text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
                    {intentosError}
                  </div>
                )}
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200">
                        fecha_creacion_date
                      </th>
                      {([1, 2, 3, 4, 6] as const).map((n) => (
                        <>
                          <th
                            key={`h${n}`}
                            className="px-2 py-3 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-300"
                          >
                            {n}
                          </th>
                          <th
                            key={`p${n}`}
                            className="px-2 py-3 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-300"
                          >
                            %
                          </th>
                        </>
                      ))}
                      <th className="px-2 py-3 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        null
                      </th>
                      <th className="px-2 py-3 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        %
                      </th>
                      <th className="px-2 py-3 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        Suma total
                      </th>
                      <th className="px-2 py-3 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {intentosIsLoading ? (
                      <tr>
                        <td
                          colSpan={16}
                          className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                        >
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3">Calculando métricas...</span>
                          </div>
                        </td>
                      </tr>
                    ) : intentosRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={16}
                          className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                        >
                          Sin datos para mostrar
                        </td>
                      </tr>
                    ) : (
                      intentosRows.map((r, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="px-3 py-2 text-xs font-mono">
                            {r.fecha}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.c1 > 0 ? (
                              <button
                                type="button"
                                onClick={() => openIntentosDetail(r.fecha, 1)}
                                className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                                title={`Ver detalle de ${r.c1} registros (1 intento)`}
                              >
                                {r.c1}
                              </button>
                            ) : (
                              r.c1
                            )}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.p1.toFixed(2)}%
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.c2 > 0 ? (
                              <button
                                type="button"
                                onClick={() => openIntentosDetail(r.fecha, 2)}
                                className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                                title={`Ver detalle de ${r.c2} registros (2 intentos)`}
                              >
                                {r.c2}
                              </button>
                            ) : (
                              r.c2
                            )}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.p2.toFixed(2)}%
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.c3 > 0 ? (
                              <button
                                type="button"
                                onClick={() => openIntentosDetail(r.fecha, 3)}
                                className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                                title={`Ver detalle de ${r.c3} registros (3 intentos)`}
                              >
                                {r.c3}
                              </button>
                            ) : (
                              r.c3
                            )}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.p3.toFixed(2)}%
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.c4 > 0 ? (
                              <button
                                type="button"
                                onClick={() => openIntentosDetail(r.fecha, 4)}
                                className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                                title={`Ver detalle de ${r.c4} registros (4 intentos)`}
                              >
                                {r.c4}
                              </button>
                            ) : (
                              r.c4
                            )}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.p4.toFixed(2)}%
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.c6 > 0 ? (
                              <button
                                type="button"
                                onClick={() => openIntentosDetail(r.fecha, 6)}
                                className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                                title={`Ver detalle de ${r.c6} registros (6 intentos)`}
                              >
                                {r.c6}
                              </button>
                            ) : (
                              r.c6
                            )}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.p6.toFixed(2)}%
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.cNull > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  openIntentosDetail(r.fecha, "null")
                                }
                                className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                                title={`Ver detalle de ${r.cNull} registros (intentos null)`}
                              >
                                {r.cNull}
                              </button>
                            ) : (
                              r.cNull
                            )}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.pNull.toFixed(2)}%
                          </td>
                          <td className="px-2 py-2 text-xs font-semibold">
                            {r.total}
                          </td>
                          <td className="px-2 py-2 text-xs font-semibold">
                            {r.pTotal.toFixed(2)}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {intentosTotals && (
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-gray-700 font-semibold">
                        <td className="px-3 py-2 text-xs">Suma total</td>
                        <td className="px-2 py-2 text-xs">
                          {intentosTotals.c1}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {(
                            (intentosTotals.c1 /
                              Math.max(1, intentosTotals.total)) *
                            100
                          ).toFixed(2)}
                          %
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {intentosTotals.c2}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {(
                            (intentosTotals.c2 /
                              Math.max(1, intentosTotals.total)) *
                            100
                          ).toFixed(2)}
                          %
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {intentosTotals.c3}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {(
                            (intentosTotals.c3 /
                              Math.max(1, intentosTotals.total)) *
                            100
                          ).toFixed(2)}
                          %
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {intentosTotals.c4}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {(
                            (intentosTotals.c4 /
                              Math.max(1, intentosTotals.total)) *
                            100
                          ).toFixed(2)}
                          %
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {intentosTotals.c6}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {(
                            (intentosTotals.c6 /
                              Math.max(1, intentosTotals.total)) *
                            100
                          ).toFixed(2)}
                          %
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {intentosTotals.cNull}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {(
                            (intentosTotals.cNull /
                              Math.max(1, intentosTotals.total)) *
                            100
                          ).toFixed(2)}
                          %
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {intentosTotals.total}
                        </td>
                        <td className="px-2 py-2 text-xs">100.00%</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                {intentosDetail && (
                  <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {intentosDetailTitle}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIntentosDetail(null);
                          setIntentosDetailTitle("");
                          setIntentosDetailKeys([]);
                        }}
                        className="px-3 py-1.5 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        Cerrar detalle
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            {intentosDetailKeys.length > 0 ? (
                              intentosDetailKeys.map((k) => (
                                <th
                                  key={k}
                                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                >
                                  {k}
                                </th>
                              ))
                            ) : (
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                (sin columnas)
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {intentosDetail.map((it, i) => (
                            <tr
                              key={i}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              {intentosDetailKeys.map((k) => (
                                <td
                                  key={k}
                                  className="px-3 py-2 text-xs align-top"
                                >
                                  {(() => {
                                    const val = (it as Record<string, unknown>)[
                                      k
                                    ];
                                    if (val == null) return "-";
                                    if (typeof val === "object") {
                                      try {
                                        const json = JSON.stringify(val);
                                        return (
                                          <span
                                            title={json}
                                            className="font-mono"
                                          >
                                            {json}
                                          </span>
                                        );
                                      } catch {
                                        return String(val);
                                      }
                                    }
                                    if (typeof val === "string") {
                                      const s = val as string;
                                      const isHttp = /^https?:\/\//i.test(s);
                                      const isS3 = /^s3:\/\//i.test(s);
                                      if (isHttp) {
                                        return (
                                          <a
                                            href={s}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={s}
                                            className="text-blue-600 dark:text-blue-400 underline hover:no-underline inline-block max-w-[420px] truncate align-middle"
                                          >
                                            {s}
                                          </a>
                                        );
                                      }
                                      if (isS3) {
                                        return (
                                          <span
                                            title={s}
                                            className="text-blue-600 dark:text-blue-400 inline-block max-w-[420px] truncate align-middle"
                                          >
                                            {s}
                                          </span>
                                        );
                                      }
                                      return s;
                                    }
                                    return String(val);
                                  })()}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : showGlobalPromedio ? (
              <div className="overflow-x-auto">
                {promedioError && (
                  <div className="p-4 text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
                    {promedioError}
                  </div>
                )}
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200">
                        fecha_creacion_date
                      </th>
                      {([1, 2, 3, 4, 6] as const).map((n) => (
                        <th
                          key={`avg${n}`}
                          className="px-2 py-3 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-300"
                        >
                          {n}
                        </th>
                      ))}
                      <th className="px-2 py-3 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        null
                      </th>
                      <th className="px-2 py-3 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        Suma total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {promedioIsLoading ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                        >
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3">
                              Calculando promedios...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : promedioRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                        >
                          Sin datos para mostrar
                        </td>
                      </tr>
                    ) : (
                      promedioRows.map((r, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="px-3 py-2 text-xs font-mono">
                            {r.fecha}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.a1 != null ? r.a1.toFixed(2) : "-"}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.a2 != null ? r.a2.toFixed(2) : "-"}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.a3 != null ? r.a3.toFixed(2) : "-"}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.a4 != null ? r.a4.toFixed(2) : "-"}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {r.a6 != null ? r.a6.toFixed(2) : "-"}
                          </td>
                          <td className="px-2 py-2 text-xs">-</td>
                          <td className="px-2 py-2 text-xs font-semibold">
                            {r.total != null ? r.total.toFixed(2) : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {promedioTotals && (
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-gray-700 font-semibold">
                        <td className="px-3 py-2 text-xs">Suma total</td>
                        <td className="px-2 py-2 text-xs">
                          {promedioTotals.a1 != null
                            ? promedioTotals.a1.toFixed(2)
                            : "-"}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {promedioTotals.a2 != null
                            ? promedioTotals.a2.toFixed(2)
                            : "-"}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {promedioTotals.a3 != null
                            ? promedioTotals.a3.toFixed(2)
                            : "-"}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {promedioTotals.a4 != null
                            ? promedioTotals.a4.toFixed(2)
                            : "-"}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {promedioTotals.a6 != null
                            ? promedioTotals.a6.toFixed(2)
                            : "-"}
                        </td>
                        <td className="px-2 py-2 text-xs">-</td>
                        <td className="px-2 py-2 text-xs">
                          {promedioTotals.total != null
                            ? promedioTotals.total.toFixed(2)
                            : "-"}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {globalKeys.length > 0 ? (
                        globalKeys.map((k) => (
                          <th
                            key={k}
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                          >
                            {k}
                          </th>
                        ))
                      ) : (
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          (sin columnas)
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {globalIsLoading ? (
                      <tr>
                        <td
                          colSpan={Math.max(1, globalKeys.length)}
                          className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                        >
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3">Cargando reporte...</span>
                          </div>
                        </td>
                      </tr>
                    ) : globalItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={Math.max(1, globalKeys.length)}
                          className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                        >
                          Sin datos para mostrar
                        </td>
                      </tr>
                    ) : (
                      globalItems.map((it, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          {globalKeys.map((k) => (
                            <td key={k} className="px-3 py-3 text-xs align-top">
                              {(() => {
                                const val = (it as Record<string, unknown>)[k];
                                if (val == null) return "-";
                                if (typeof val === "object") {
                                  try {
                                    const json = JSON.stringify(val);
                                    return (
                                      <span title={json} className="font-mono">
                                        {json}
                                      </span>
                                    );
                                  } catch {
                                    return String(val);
                                  }
                                }
                                if (typeof val === "string") {
                                  const s = val as string;
                                  const isHttp = /^https?:\/\//i.test(s);
                                  const isS3 = /^s3:\/\//i.test(s);
                                  if (isHttp) {
                                    return (
                                      <a
                                        href={s}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={s}
                                        className="text-blue-600 dark:text-blue-400 underline hover:no-underline inline-block max-w-[420px] truncate align-middle"
                                      >
                                        {s}
                                      </a>
                                    );
                                  }
                                  if (isS3) {
                                    return (
                                      <span
                                        title={s}
                                        className="text-blue-600 dark:text-blue-400 inline-block max-w-[420px] truncate align-middle"
                                      >
                                        {s}
                                      </span>
                                    );
                                  }
                                  return s;
                                }
                                return String(val);
                              })()}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {globalPagination
                  ? `Total ${globalPagination.total} • Página ${globalPagination.page} de ${globalPagination.totalPages}`
                  : ""}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGlobalPage((p) => Math.max(1, p - 1))}
                  disabled={!globalPagination?.hasPreviousPage}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    !globalPagination?.hasPreviousPage
                      ? "text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed"
                      : "text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  ◀ Anterior
                </button>
                <button
                  onClick={() => setGlobalPage((p) => p + 1)}
                  disabled={!globalPagination?.hasNextPage}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    !globalPagination?.hasNextPage
                      ? "text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed"
                      : "text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  Siguiente ▶
                </button>
              </div>
            </div>
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
                            title="Doble clic para agregar motivo asesor"
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
                                case "motivoNoAfiliacionAsesor":
                                  return (
                                    <td
                                      key={col.id}
                                      className={`${col.widthClass} px-3 py-3 text-sm text-gray-900 dark:text-gray-100`}
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenAsesorModal(row);
                                      }}
                                      title="Doble clic para agregar motivo asesor"
                                    >
                                      {row.motivoNoAfiliacionAsesor &&
                                      row.motivoNoAfiliacionAsesor.trim() !==
                                        "" ? (
                                        <p
                                          className="text-xs text-gray-800 dark:text-gray-200 whitespace-normal break-words leading-relaxed"
                                          title={row.motivoNoAfiliacionAsesor}
                                        >
                                          {row.motivoNoAfiliacionAsesor}
                                        </p>
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
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenItModal(row);
                                      }}
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenItModal(row);
                                      }}
                                      title="Click para agregar motivo IT"
                                    >
                                      {(row.motivoNoAfiliacion &&
                                        row.motivoNoAfiliacion.trim() !== "") ||
                                      motivosNoAfiliacion[
                                        row.idUsuarioDigital || ""
                                      ] ? (
                                        <p
                                          className="text-xs text-gray-800 dark:text-gray-200 whitespace-normal break-words leading-relaxed"
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
        {activeView === "usuarios" && (
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
        {/* Modal para Motivo Asesor */}
        {isModalAsesorOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
              {/* Header del Modal */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Motivo Asesor
                </h3>
                <button
                  onClick={handleCloseAsesorModal}
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
                </div>
              </div>

              {/* Formulario */}
              <div className="p-6">
                <div className="mb-4">
                  <label
                    htmlFor="motivoNoAfiliacionAsesor"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Motivo Asesor
                  </label>
                  <textarea
                    id="motivoNoAfiliacionAsesor"
                    rows={4}
                    value={motivoNoAfiliacionAsesorInput}
                    onChange={(e) =>
                      setMotivoNoAfiliacionAsesorInput(e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                    placeholder="Describe el motivo ingresado por el asesor (opcional)..."
                    autoFocus
                  />
                </div>

                {/* Botones */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleCloseAsesorModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveMotivoAsesor}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    Guardar Motivo Asesor
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
