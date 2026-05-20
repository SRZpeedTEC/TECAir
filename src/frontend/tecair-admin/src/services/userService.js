import { apiFetch, BASE_URL } from './api.js';

// GET /api/users/{email} → 200 UserResponse | 404 { message }
// UserResponse: { email, fullName, phoneNum, role, isStudent, collegeName, userCarnet, miles }
export async function getUserByEmail(email) {
  return apiFetch(`/users/${encodeURIComponent(email)}`, { method: 'GET' });
}

// POST /api/users → 201 UserResponse | 400 | 409
// payload: { email, password, name, lname, phoneNum, role, isStudent, userCarnet?, collegeName? }
export async function createUser(payload) {
  return apiFetch('/users', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

// PUT /api/users/{email} → 200 UserResponse | 400 | 404 | 409
// payload: { password?, name, lname, phoneNum, role, isStudent, userCarnet?, collegeName? }
// Si password viene vacio el backend conserva el hash existente.
export async function updateUser(email, payload) {
  return apiFetch(`/users/${encodeURIComponent(email)}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

// DELETE /api/users/{email} → 204 | 404 | 409
// 204 No Content → no se usa apiFetch (que hace res.json()).
export async function deleteUser(email) {
  const res = await fetch(`${BASE_URL}/users/${encodeURIComponent(email)}`, {
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

// Mapea mensajes del backend (ingles) a textos en espanol para la UI admin.
// Si el mensaje no se conoce, devuelve el original.
export function translateUserError(message) {
  if (!message) return 'Ocurrio un error.';

  const map = {
    'Email is required.':       'El correo es requerido.',
    'Password is required.':    'La contrasena es requerida.',
    'Name is required.':        'El nombre es requerido.',
    'Last name is required.':   'El apellido es requerido.',
    'Phone number is required.': 'El telefono es requerido.',
    'Role is required.':        'El rol es requerido.',
    'Role must be CLIENT or ADMIN.': 'El rol debe ser CLIENT o ADMIN.',
    'Student users require UserCarnet and CollegeName.':
      'Los estudiantes requieren carnet y universidad.',
    'The user cannot be deleted because it already has reservations.':
      'No se puede eliminar: el usuario ya tiene reservaciones.',
    'Email route parameter is required.': 'El correo es requerido.',
  };
  if (map[message]) return map[message];

  if (/^User '.+' already exists\.$/.test(message)) {
    return 'Ya existe una cuenta con ese correo.';
  }
  if (/^Student carnet '.+' already belongs to another student\.$/.test(message)) {
    return 'Ese carnet ya esta registrado por otro estudiante.';
  }
  if (/^User '.+' was not found\.$/.test(message)) {
    return 'No se encontro el usuario.';
  }
  if (message === 'Error 500' || /^Error 5\d\d$/.test(message)) {
    return 'No se pudo procesar la solicitud (posible duplicado de telefono o formato invalido).';
  }
  return message;
}

// Divide el fullName devuelto por GET en { name, lname } usando el primer espacio.
// Heuristica: para nombres compuestos (ej. "Maria Jose Robles Perez") name=Maria,
// lname="Jose Robles Perez". El admin puede ajustar manualmente en el form.
export function splitFullName(fullName) {
  if (!fullName) return { name: '', lname: '' };
  const idx = fullName.indexOf(' ');
  if (idx < 0) return { name: fullName, lname: '' };
  return { name: fullName.slice(0, idx), lname: fullName.slice(idx + 1) };
}
