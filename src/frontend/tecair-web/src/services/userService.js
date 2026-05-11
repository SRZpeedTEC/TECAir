import { apiFetch } from './api.js';

// ─────────────────────────────────────────────────────────────────────────────
// MODO STUB: las funciones simulan la API con un delay artificial.
// Para conectar al backend real:
//   1. Confirma que vite.config.js tenga proxy para /users (ya está).
//   2. Elimina el bloque STUB de cada función y descomenta el bloque REAL.
// ─────────────────────────────────────────────────────────────────────────────

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// POST /users/login  →  200 UserResponse | 401 { message }
// ⚠ Este endpoint aún no existe en el backend — hay que crearlo.
export async function loginUser(email, password) {
  // ── REAL ──────────────────────────────────────────────────────────────────
  // return apiFetch('/users/login', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email, password }),
  // });

  // ── STUB ──────────────────────────────────────────────────────────────────
  await delay(700);
  if (!password) throw new Error('Credenciales incorrectas.');
  const isStudent = email.includes('student') || email.includes('tec');
  return {
    email,
    fullName: 'Usuario Demo',
    phoneNum: '8888-0000',
    role: 'CLIENT',
    isStudent,
    collegeName: isStudent ? 'TEC Costa Rica' : null,
    userCarnet: isStudent ? 'TEC-2024-001' : null,
    miles: isStudent ? 150 : null,
  };
}

// POST /users/{email}/student  →  200 UserResponse | 409 { message }
// ⚠ Este endpoint aún no existe en el backend — hay que crearlo.
export async function enrollAsStudent(email, collegeName, userCarnet, currentUser) {
  // ── REAL ──────────────────────────────────────────────────────────────────
  // return apiFetch(`/users/${encodeURIComponent(email)}/student`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ collegeName, userCarnet }),
  // });

  // ── STUB ──────────────────────────────────────────────────────────────────
  await delay(800);
  return { ...currentUser, isStudent: true, collegeName, userCarnet, miles: 0 };
}

// POST /users  →  201 UserResponse | 400 { message } | 409 { message }
// ✅ Este endpoint ya existe en el backend.
export async function registerUser(data) {
  // ── REAL ──────────────────────────────────────────────────────────────────
  // return apiFetch('/users', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // });

  // ── STUB ──────────────────────────────────────────────────────────────────
  await delay(900);
  return {
    email: data.email,
    fullName: `${data.name} ${data.lname}`,
    phoneNum: data.phoneNum,
    role: 'CLIENT',
    isStudent: data.isStudent,
    collegeName: data.isStudent ? data.collegeName : null,
    userCarnet: data.isStudent ? data.userCarnet : null,
    miles: data.isStudent ? 0 : null,
  };
}
