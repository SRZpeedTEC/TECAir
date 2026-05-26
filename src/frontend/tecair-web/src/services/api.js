export const API_URL = "http://localhost:5000";

// Web (IIS):     BASE_URL = http://localhost:5000/api  (sin env var → usa API_URL)
// Mobile build:  BASE_URL = http://10.0.2.2:5000/api   (VITE_API_BASE_URL inyectado por build:web)
export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? `${API_URL}/api`;

// Helper generico de fetch: lanza un Error con el mensaje del servidor si el status no es 2xx.
export async function apiFetch(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, options);

  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch {
      // Si el cuerpo no es JSON dejamos el mensaje generico.
    }
    throw new Error(msg);
  }

  return res.json();
}
