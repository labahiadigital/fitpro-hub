import axios from "axios";

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data) {
      if (typeof data.detail === "string") return data.detail;
      if (Array.isArray(data.detail)) {
        const first = data.detail[0];
        if (first?.msg) return first.msg;
        return "Error de validación";
      }
      if (typeof data.message === "string") return data.message;
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Ha ocurrido un error inesperado";
}
