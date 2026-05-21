import { apiFetch } from './api.js';

// POST /api/auth/login → 200 LoginResponse | 401 { message } | 400 { message }
// LoginResponse: { email, fullName, role, isStudent, collegeName, userCarnet, miles, message }
export async function loginAdmin(email, password) {
  return apiFetch('/auth/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });
}

// Mapeo de mensajes del backend (en ingles) a textos en espanol para el login admin.
export function translateLoginError(message) {
  if (!message) return 'Ocurrio un error.';
  const map = {
    'Invalid email or password.': 'Correo o contrasena incorrectos.',
    'Email is required.':         'El correo es requerido.',
    'Password is required.':      'La contrasena es requerida.',
  };
  if (map[message]) return map[message];
  if (message === 'Error 500' || /^Error 5\d\d$/.test(message)) {
    return 'No se pudo procesar el inicio de sesion. Intenta de nuevo.';
  }
  return message;
}
