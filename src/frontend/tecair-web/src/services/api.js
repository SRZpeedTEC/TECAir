export const API_URL = "http://localhost:5000";
export const BASE_URL = `${API_URL}/api`;

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
