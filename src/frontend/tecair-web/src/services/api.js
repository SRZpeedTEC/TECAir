// Base URL leída de la variable de entorno.
// En desarrollo: '/api' (ruta relativa, el proxy de Vite la redirige a localhost:5000).
// En Android:    'http://10.0.2.2:5000/api' (sobreescrita en el script build:android).
export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

// Helper genérico de fetch: lanza un Error con el mensaje del servidor si el status no es 2xx.
export async function apiFetch(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, options);

  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch {
      // si el cuerpo no es JSON dejamos el mensaje genérico
    }
    throw new Error(msg);
  }

  return res.json();
}
