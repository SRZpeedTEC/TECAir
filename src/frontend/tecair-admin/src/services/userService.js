import { apiFetch, BASE_URL } from './api.js';

// Cliente HTTP para el modulo de gestion de usuarios.
// Endpoints expuestos por UsersController:
//   GET    /users/{email}        → UserResponse
//   POST   /users                → UserResponse (201)
//   PUT    /api/users/{email}    → UserResponse
//   DELETE /api/users/{email}    → 204 NoContent
//
// UserResponse: { email, fullName, phoneNum, role, isStudent, collegeName, userCarnet, miles }

// El email forma parte de la ruta y puede contener caracteres como '@' o '+'.
function encodeEmail(email) {
  return encodeURIComponent(email.trim());
}

export async function getUserByEmail(email) {
  return apiFetch(`/users/${encodeEmail(email)}`);
}

export async function createUser(payload) {
  return apiFetch('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateUser(email, payload) {
  return apiFetch(`/users/${encodeEmail(email)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// DELETE devuelve 204 sin cuerpo, asi que no se puede pasar por apiFetch (que hace res.json()).
export async function deleteUser(email) {
  const res = await fetch(`${BASE_URL}/users/${encodeEmail(email)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch { /* sin body json */ }
    throw new Error(msg);
  }
  return true;
}
