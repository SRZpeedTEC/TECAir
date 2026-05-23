import { apiFetch, BASE_URL } from './api.js';

// Cliente HTTP del modulo de usuarios (UsersController).
// UserResponse: { email, fullName, phoneNum, role, isStudent, collegeName, userCarnet, miles }

// El email es parte de la ruta y puede traer caracteres como '@' o '+'.
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

// DELETE devuelve 204 sin cuerpo, por eso no usamos apiFetch (hace res.json()).
export async function deleteUser(email) {
  const res = await fetch(`${BASE_URL}/users/${encodeEmail(email)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch { /* body no JSON */ }
    throw new Error(msg);
  }
  return true;
}
