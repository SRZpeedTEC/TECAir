import { apiFetch } from './api.js';

// POST /api/auth/login → 200 LoginResponse | 401 { message } | 400 { message }
// El backend devuelve: { email, fullName, role, isStudent, collegeName, userCarnet, miles, message }
// El frontend no tiene phoneNum desde login porque LoginResponse no lo expone.
export async function loginUser(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

// POST /api/users → 201 UserResponse | 400 { message } | 409 { message }
// Crea el usuario y lo devuelve listo para usar como sesion activa.
export async function registerUser(data) {
  return apiFetch('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// GET /users/{email} → 200 UserResponse | 404
export async function getUserByEmail(email) {
  return apiFetch(`/users/${encodeURIComponent(email)}`);
}

// PUT /api/users/{email} → 200 UserResponse | 400 | 404
// Envía contraseña vacía para no cambiarla; el backend la preserva si viene en blanco.
export async function updateUser(email, data) {
  return apiFetch(`/users/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// POST /users/{email}/student → endpoint todavía no existe en backend.
// Stub temporal: marca el usuario como estudiante en memoria.
// TODO: implementar el endpoint real en backend.
export async function enrollAsStudent(email, collegeName, userCarnet, currentUser) {
  await new Promise((r) => setTimeout(r, 400));
  return { ...currentUser, isStudent: true, collegeName, userCarnet, miles: 0 };
}
