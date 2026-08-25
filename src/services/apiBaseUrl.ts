// Em dev, o proxy do Vite já resolve "/api/..." para o backend local.
// Em produção (front hospedado fora do backend), precisamos da URL completa.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
