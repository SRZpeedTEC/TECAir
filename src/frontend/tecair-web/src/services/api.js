export const API_URL = "http://localhost:5000";

// Web (IIS):     BASE_URL = http://localhost:5000/api  (sin env var → usa API_URL)
// Mobile build:  BASE_URL = http://10.0.2.2:5000/api   (VITE_API_BASE_URL inyectado por build:web)
export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? `${API_URL}/api`;

// Origen donde el servidor publica los archivos estáticos (/uploads/...).
// Es BASE_URL sin el sufijo /api. Si BASE_URL es relativa (dev: "/api"),
// cae en API_URL para conservar el host correcto.
export const ASSET_URL = /^https?:\/\//.test(BASE_URL)
  ? BASE_URL.replace(/\/api\/?$/, '')
  : API_URL;

// Reescribe el host de una imageUrl de promoción al origen de assets de ESTE
// cliente. La API persiste una URL absoluta con el host del momento de subida
// (p. ej. http://localhost:5000 desde el admin web), que no es alcanzable desde
// el dispositivo móvil. Aquí tomamos solo la ruta y la rebasamos sobre ASSET_URL
// (http://10.0.2.2:5000 en el build móvil, localhost en web). Acepta URLs
// absolutas o rutas relativas.
export function resolveImageUrl(imageUrl) {
  if (!imageUrl) return imageUrl;
  try {
    const u = new URL(imageUrl, ASSET_URL || window.location.origin);
    return `${ASSET_URL}${u.pathname}${u.search}`;
  } catch {
    return imageUrl;
  }
}

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
