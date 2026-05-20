import { apiFetch } from './api.js';

// GET /api/users/{email} → 200 UserResponse | 404 { message }
// Forma canonica del usuario para la sesion: incluye phoneNum (que LoginResponse no expone).
export async function getUserByEmail(email) {
  return apiFetch(`/users/${encodeURIComponent(email)}`, { method: 'GET' });
}

// POST /api/auth/login → 200 LoginResponse | 401 { message } | 400 { message }
// Tras verificar credenciales se hace un GET para devolver siempre la forma UserResponse
// (con phoneNum). Asi el objeto de sesion es identico venga de login o de registro.
export async function loginUser(email, password) {
  const loginResp = await apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  return getUserByEmail(loginResp.email);
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

// POST /users/{email}/student → endpoint todavia no existe en backend.
// Stub temporal: marca el usuario como estudiante en memoria.
// TODO: implementar el endpoint real en backend.
export async function enrollAsStudent(email, collegeName, userCarnet, currentUser) {
  await new Promise((r) => setTimeout(r, 400));
  return { ...currentUser, isStudent: true, collegeName, userCarnet, miles: 0 };
}

// Traduce los mensajes que vienen del backend (en ingles) a textos en espanol
// para la UI. Si el mensaje no se conoce, se muestra el original.
export function translateAuthError(message) {
  if (!message) return 'Ocurrio un error. Intentalo de nuevo.';

  const map = {
    'Invalid email or password.': 'Correo o contrasena incorrectos.',
    'Email is required.': 'El correo electronico es requerido.',
    'Password is required.': 'La contrasena es requerida.',
    'Name is required.': 'El nombre es requerido.',
    'Last name is required.': 'El apellido es requerido.',
    'Phone number is required.': 'El telefono es requerido.',
    'Role is required.': 'El rol es requerido.',
    'Role must be CLIENT or ADMIN.': 'Rol invalido.',
    'Student users require UserCarnet and CollegeName.':
      'Como estudiante debes ingresar carnet y universidad.',
  };

  if (map[message]) return map[message];

  // Mensajes con interpolacion (ej. nombres de email/carnet)
  if (/^User '.+' already exists\.$/.test(message)) {
    return 'Ya existe una cuenta con ese correo.';
  }
  if (/^Student carnet '.+' already belongs to another student\.$/.test(message)) {
    return 'Ese carnet ya esta registrado por otro estudiante.';
  }
  if (/^User '.+' was not found\.$/.test(message)) {
    return 'Usuario no encontrado.';
  }

  // 500 por violaciones que el backend no captura (ej. telefono duplicado, email mal formado)
  if (message === 'Error 500' || /^Error 5\d\d$/.test(message)) {
    return 'No se pudo procesar la solicitud. Verifica los datos e intenta de nuevo.';
  }

  return message;
}
