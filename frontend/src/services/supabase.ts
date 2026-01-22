/**
 * NOTA: Este archivo debe ser migrado para usar el backend.
 * Las funciones de autenticación ya usan el backend via ./api.ts
 * 
 * Las funciones de datos (supabase.from()) todavía acceden directamente
 * a Supabase temporalmente hasta que se migren todos los hooks.
 * 
 * TODO: Migrar todos los hooks de useSupabaseData.ts para usar el backend
 */

import { createClient } from "@supabase/supabase-js";
import { authApi, api } from "./api";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!(supabaseUrl && supabaseAnonKey)) {
  throw new Error("Missing Supabase environment variables");
}

// Cliente de Supabase para lectura de datos (temporalmente mientras se migra)
// TODO: Eliminar cuando todos los hooks usen el backend
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// === FUNCIONES QUE USAN EL BACKEND (CORRECTO) ===

export const signUp = async (
  email: string,
  password: string,
  metadata?: { full_name?: string }
) => {
  try {
    const response = await authApi.register({
      email,
      password,
      full_name: metadata?.full_name || "",
      workspace_name: "",
    });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const response = await authApi.login(email, password);
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    await authApi.logout();
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const getSession = async () => {
  // El backend maneja las sesiones via JWT almacenado en Zustand
  return { data: null, error: null };
};

export const getUser = async () => {
  try {
    const response = await authApi.me();
    return { data: { user: response.data }, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Stub para compatibilidad - El frontend usa Zustand para estado de auth
export const onAuthStateChange = (callback: (event: string, session: unknown) => void) => {
  // No hacer nada - el frontend maneja el estado con Zustand
  return { data: { subscription: { unsubscribe: () => {} } } };
};
