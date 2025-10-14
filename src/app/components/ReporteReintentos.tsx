"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { ReactNode } from "react";

type Reintento = {
  id: string | number | null;
  id_usuario_digital: string | number | null;
  id_tipo_evento: string | number | null;
  tipo_evento: string | null;
  ocr_identificacion: string | null;
  analisis_similitud: string | null;
  imagen_frontal: string | null;
  imagen_trasera: string | null;
  selfie: string | null;
  fecha_registro: string | null;
};

interface Props {
  startDate: string;
  endDate: string;
  refreshKey?: number;
}

export default function ReporteReintentos({
  startDate,
  endDate,
  refreshKey = 0,
}: Props) {
  const [rows, setRows] = useState<Reintento[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [soloFrecuentes, setSoloFrecuentes] = useState<boolean>(false);
  type JsonModal = {
    id: number;
    title: string;
    content: string;
    kind: "json" | "image";
    x: number;
    y: number;
    z: number;
  };
  const [jsonModals, setJsonModals] = useState<JsonModal[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const nextZRef = useRef<number>(1000);

  const formatHondurasDate = (value: string | Date | null) => {
    if (!value) return "";
    const raw = typeof value === "string" ? value : value.toISOString();
    // Reemplazar espacio por 'T' y recortar fracciones > milisegundos (p.ej. .085621 -> .085)
    const base = raw.replace(" ", "T");
    const trimmedFraction = base.replace(/\.(\d{3})\d+$/, ".$1");
    const withoutZ = trimmedFraction.endsWith("Z")
      ? trimmedFraction.slice(0, -1)
      : trimmedFraction;
    const dateObj = new Date(withoutZ);
    if (isNaN(dateObj.getTime())) {
      // Fallback: devolver cadena legible si no se pudo parsear
      return base.replace("T", " ");
    }
    // Incluir segundos y milisegundos (3 dígitos)
    return new Intl.DateTimeFormat("es-HN", {
      timeZone: "America/Tegucigalpa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
      hour12: false,
    }).format(dateObj);
  };

  const fetchReintentos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (startDate) params.append("fechaInicio", startDate);
      if (endDate) params.append("fechaFin", endDate);

      // Nota: Este endpoint es provisional. Implementar en /api/reintentos si es necesario.
      const resp = await fetch(`/api/reintentos?${params.toString()}`, {
        cache: "no-store",
      });

      if (!resp.ok) {
        // Si no existe el endpoint aún, no interrumpir la UI; mostrar vacío.
        setRows([]);
        setError(null);
        return;
      }

      const json = await resp.json();
      const data: unknown = Array.isArray(json?.data) ? json.data : [];
      const mapped: Reintento[] = (data as unknown[]).map((rUnknown) => {
        const r = rUnknown as Partial<Reintento & Record<string, unknown>>;
        return {
          id: r?.id ?? null,
          id_usuario_digital: r?.id_usuario_digital ?? null,
          id_tipo_evento: r?.id_tipo_evento ?? null,
          tipo_evento: r?.tipo_evento ?? null,
          ocr_identificacion: r?.ocr_identificacion ?? null,
          analisis_similitud: r?.analisis_similitud ?? null,
          imagen_frontal: r?.imagen_frontal ?? null,
          imagen_trasera: r?.imagen_trasera ?? null,
          selfie: r?.selfie ?? null,
          fecha_registro: r?.fecha_registro ?? null,
        } as Reintento;
      });
      setRows(mapped);
    } catch (e) {
      // Silencioso: dejar la tabla vacía si hay error
      setRows([]);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, refreshKey]);

  useEffect(() => {
    fetchReintentos();
  }, [fetchReintentos]);

  const deepJsonParse = (input: unknown): unknown => {
    let current: unknown = input;
    for (let i = 0; i < 3; i++) {
      if (typeof current === "string") {
        const str = current as string;
        try {
          current = JSON.parse(str);
          continue;
        } catch {
          break;
        }
      }
    }
    return current;
  };

  const normalizeToPrettyJson = (value: unknown): string => {
    const parsed = deepJsonParse(value);
    try {
      if (typeof parsed === "string") {
        const unescaped = (parsed as string).replace(/\\\"/g, '"');
        const maybe = JSON.parse(unescaped);
        return JSON.stringify(maybe, null, 2);
      }
      return JSON.stringify(parsed, null, 2);
    } catch {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value ?? "");
      }
    }
  };

  const ColoredJson = ({ code }: { code: string }) => {
    const pieces: ReactNode[] = [];
    const src = code;
    const regex =
      /(\"(?:\\.|[^\"])*\")|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\]:,])/g;
    let lastIndex = 0;
    let idx = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(src)) !== null) {
      if (match.index > lastIndex) {
        const text = src.slice(lastIndex, match.index);
        pieces.push(<span key={`t${idx++}`}>{text}</span>);
      }
      const full = match[0];
      const str = match[1];
      const boolNull = match[2];
      const num = match[3];
      const punct = match[4];
      let cls = "";
      if (str) {
        const after = src.slice(regex.lastIndex);
        let k = 0;
        while (k < after.length && /\s/.test(after[k])) k++;
        const isKey = after[k] === ":";
        cls = isKey ? "text-purple-400" : "text-emerald-400"; // Dracula-like
      } else if (boolNull) {
        cls = "text-pink-400";
      } else if (num) {
        cls = "text-amber-300";
      } else if (punct) {
        cls = "text-indigo-300";
      }
      pieces.push(
        <span key={`m${idx++}`} className={cls}>
          {full}
        </span>
      );
      lastIndex = match.index + full.length;
    }
    if (lastIndex < src.length) {
      pieces.push(<span key={`t${idx++}`}>{src.slice(lastIndex)}</span>);
    }
    return (
      <pre className="text-xs sm:text-sm leading-relaxed font-mono whitespace-pre-wrap break-words bg-[#282a36] text-[#f8f8f2] p-3 rounded-md border border-gray-700">
        {pieces}
      </pre>
    );
  };

  const openJsonModal = (raw: unknown, title: string) => {
    const pretty = normalizeToPrettyJson(raw);
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const base = 80 + jsonModals.length * 32;
    nextZRef.current += 1;
    const z = nextZRef.current;
    setJsonModals((prev) => [
      ...prev,
      { id, title, content: pretty, kind: "json", x: base, y: base, z },
    ]);
  };

  const openImageModal = (url: string, title: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const base = 100 + jsonModals.length * 36;
    nextZRef.current += 1;
    const z = nextZRef.current;
    setJsonModals((prev) => [
      ...prev,
      { id, title, content: url, kind: "image", x: base, y: base, z },
    ]);
  };

  const closeJsonModal = (id: number) => {
    setJsonModals((prev) => prev.filter((m) => m.id !== id));
  };

  const bringToFront = (id: number) => {
    nextZRef.current += 1;
    const z = nextZRef.current;
    setJsonModals((prev) => prev.map((m) => (m.id === id ? { ...m, z } : m)));
  };

  const handleHeaderMouseDown = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    const modal = jsonModals.find((m) => m.id === id);
    if (!modal) return;
    setDraggingId(id);
    setDragOffset({ x: e.clientX - modal.x, y: e.clientY - modal.y });
    bringToFront(id);
  };

  useEffect(() => {
    if (draggingId === null) return;
    const onMove = (e: MouseEvent) => {
      setJsonModals((prev) =>
        prev.map((m) =>
          m.id === draggingId
            ? {
                ...m,
                x: Math.max(
                  8,
                  Math.min(window.innerWidth - 320, e.clientX - dragOffset.x)
                ),
                y: Math.max(
                  8,
                  Math.min(window.innerHeight - 120, e.clientY - dragOffset.y)
                ),
              }
            : m
        )
      );
    };
    const onUp = () => setDraggingId(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingId, dragOffset.x, dragOffset.y]);

  // Cerrar el modal superior con ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setJsonModals((prev) => {
          if (prev.length === 0) return prev;
          const top = prev.reduce((acc, m) => (m.z > acc.z ? m : acc), prev[0]);
          return prev.filter((m) => m.id !== top.id);
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const countsByUserId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const key =
        r.id_usuario_digital != null ? String(r.id_usuario_digital) : "";
      if (!key) continue;
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [rows]);

  const visibleRows = useMemo(() => {
    if (!soloFrecuentes) return rows;
    return rows.filter((r) => {
      const key =
        r.id_usuario_digital != null ? String(r.id_usuario_digital) : "";
      if (!key) return false;
      return (countsByUserId[key] || 0) > 3; // misma validación que el resaltado
    });
  }, [rows, soloFrecuentes, countsByUserId]);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            checked={soloFrecuentes}
            onChange={(e) => setSoloFrecuentes(e.target.checked)}
          />
          <span>Mostrar solo IDs con más de 2 intentos</span>
        </label>
        <div className="text-xs px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          {isLoading
            ? "Filtrando..."
            : `${visibleRows.length} registros visibles`}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                id
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                id_usuario_digital
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                tipo_evento
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                ocr_identificacion
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                analisis_similitud
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                imagen_frontal
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                imagen_trasera
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                selfie
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                fecha_registro
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3">Cargando reintentos...</span>
                  </div>
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  No hay datos de reintentos para el rango seleccionado
                </td>
              </tr>
            ) : (
              visibleRows.map((r, idx) => {
                const idKey =
                  r.id_usuario_digital != null
                    ? String(r.id_usuario_digital)
                    : "";
                const isFrequent = idKey && (countsByUserId[idKey] || 0) > 3;
                return (
                  <tr
                    key={idx}
                    className={`${
                      isFrequent
                        ? "bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500"
                        : ""
                    } hover:bg-gray-50 dark:hover:bg-gray-700`}
                  >
                    <td className="px-3 py-3 text-xs text-gray-900 dark:text-gray-100 font-mono truncate">
                      {r.id ?? "-"}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-900 dark:text-gray-100 font-mono truncate">
                      {r.id_usuario_digital ?? "-"}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-900 dark:text-gray-100 truncate">
                      {(() => {
                        const idTipo = r.id_tipo_evento ?? null;
                        if (idTipo === 2 || idTipo === "2") {
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              OPEN AI
                            </span>
                          );
                        }
                        if (idTipo === 3 || idTipo === "3") {
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-200 text-amber-900 dark:bg-amber-300/30 dark:text-amber-300">
                              LAMDA
                            </span>
                          );
                        }
                        return r.tipo_evento ?? "-";
                      })()}
                    </td>
                    <td className="px-3 py-3 text-xs text-blue-600 dark:text-blue-400 truncate">
                      {r.ocr_identificacion ? (
                        <button
                          type="button"
                          onClick={() =>
                            openJsonModal(
                              r.ocr_identificacion,
                              "OCR Identificación"
                            )
                          }
                          className="underline hover:no-underline"
                          title="Ver JSON de OCR"
                        >
                          Ver JSON
                        </button>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-blue-600 dark:text-blue-400 truncate">
                      {r.analisis_similitud ? (
                        <button
                          type="button"
                          onClick={() =>
                            openJsonModal(
                              r.analisis_similitud,
                              "Análisis de Similitud"
                            )
                          }
                          className="underline hover:no-underline"
                          title="Ver JSON de Análisis de Similitud"
                        >
                          Ver JSON
                        </button>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs truncate">
                      {r.imagen_frontal ? (
                        <button
                          type="button"
                          onClick={() =>
                            openImageModal(
                              r.imagen_frontal as string,
                              "Imagen frontal"
                            )
                          }
                          className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                          title="Ver imagen frontal"
                        >
                          Ver
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs truncate">
                      {r.imagen_trasera ? (
                        <button
                          type="button"
                          onClick={() =>
                            openImageModal(
                              r.imagen_trasera as string,
                              "Imagen trasera"
                            )
                          }
                          className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                          title="Ver imagen trasera"
                        >
                          Ver
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs truncate">
                      {r.selfie ? (
                        <button
                          type="button"
                          onClick={() =>
                            openImageModal(r.selfie as string, "Selfie")
                          }
                          className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                          title="Ver selfie"
                        >
                          Ver
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-900 dark:text-gray-100">
                      {r.fecha_registro
                        ? formatHondurasDate(r.fecha_registro)
                        : "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {jsonModals.map((m) => (
        <div
          key={m.id}
          className="fixed"
          style={{
            left: m.x,
            top: m.y,
            zIndex: m.z,
            width: "min(92vw, 720px)",
          }}
          onMouseDown={() => bringToFront(m.id)}
        >
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            <div className="relative border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-move select-none border-b border-gray-200 dark:border-gray-700"
                onMouseDown={(e) => handleHeaderMouseDown(m.id, e)}
              >
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
                  {m.title}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        navigator.clipboard?.writeText(m.content);
                      } catch {}
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    title="Copiar JSON"
                  >
                    Copiar
                  </button>
                  <button
                    type="button"
                    onClick={() => closeJsonModal(m.id)}
                    className="p-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    aria-label="Cerrar"
                    title="Cerrar"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="px-4 pb-4 max-h-[70vh] overflow-auto">
                {m.kind === "json" ? (
                  <ColoredJson code={m.content} />
                ) : (
                  <div className="flex items-center justify-center">
                    <img
                      src={m.content}
                      alt={m.title}
                      className={`${
                        m.title === "Selfie"
                          ? "max-h-[56vh] max-w-[70vw]"
                          : "max-h-[32vh] max-w-[48vw]"
                      } object-contain rounded-md border border-gray-200 dark:border-gray-700`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
