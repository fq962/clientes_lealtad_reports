// Tipos para la aplicación de usuarios digitales

export interface UsuarioDigitalUI {
  fechaUsuarioDigital: string;
  ultimoInicioSesionApp?: string;
  idUsuarioDigital: string;
  nombrePreferido?: string | null;
  motivoNoAfiliacion?: string | null;
  motivoNoAfiliacionAsesor?: string | null;
  nombreCompletoContacto?: string | null;
  identificacion?: string | null;
  tipoIdentificacion?: string | null;
  idContacto?: string | null;
  correoApp?: string | null;
  emailValidado?: boolean | null;
  metodoAuth?: string | null;
  telefonoApp?: string | null;
  telefonoValidado?: boolean | null;
  fotoPerfilApp?: string | null;
  origenCreacion?: "WEB" | "APP" | null;
  [key: string]: string | boolean | null | undefined; // Index signature para ordenamiento
}

export interface UsuarioDigitalFromAPI {
  fechaUsuarioDigital?: string | Date;
  ultimoInicioSesionApp?: string | Date;
  idUsuarioDigital: string | number;
  nombrePreferido?: string;
  motivoNoAfiliacion?: string | null;
  motivoNoAfiliacionAsesor?: string | null;
  nombreCompletoContacto?: string;
  identificacion?: string;
  tipoIdentificacion?: string;
  idContacto?: string | number | null;
  correoApp?: string;
  emailValidado?: boolean;
  metodoAuth?: string;
  telefonoApp?: string;
  telefonoValidado?: boolean;
  fotoPerfilApp?: string;
  origenCreacion?: "WEB" | "APP" | string | null;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  error?: string;
}
