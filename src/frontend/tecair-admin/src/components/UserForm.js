import { useState } from 'react';

// Mismo patron que la DB (ck_app_user_email_format), insensible a mayusculas.
const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

function isValidPhone(p) {
  return p.replace(/\D/g, '').length >= 7;
}

// Formulario de usuario reutilizable para crear y editar.
//
// Props:
//   mode          — 'create' | 'edit'
//   initialValues — { email, name, lname, phoneNum, role, isStudent, userCarnet, collegeName }
//                   Solo se usan en mode='edit'. El email se vuelve readonly.
//   onSubmit      — async (payload) => void.
//   onCancel      — () => void.
//   submitting    — bool externo, deshabilita el boton submit.
//   submitError   — string|null, banner de error que viene del backend.
export default function UserForm({
  mode = 'create',
  initialValues,
  onSubmit,
  onCancel,
  submitting,
  submitError,
}) {
  const init = initialValues ?? {};
  const isEdit = mode === 'edit';

  const [email,       setEmail]       = useState(init.email ?? '');
  const [password,    setPassword]    = useState('');
  const [name,        setName]        = useState(init.name ?? '');
  const [lname,       setLname]       = useState(init.lname ?? '');
  const [phoneNum,    setPhoneNum]    = useState(init.phoneNum ?? '');
  const [role,        setRole]        = useState(init.role ?? 'CLIENT');
  const [isStudent,   setIsStudent]   = useState(init.isStudent ?? false);
  const [userCarnet,  setUserCarnet]  = useState(init.userCarnet ?? '');
  const [collegeName, setCollegeName] = useState(init.collegeName ?? '');
  const [localError,  setLocalError]  = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    // Validaciones cliente: replican las que existen en el backend mas
    // formato basico. En edicion el email no se puede cambiar (es PK).
    if (!isEdit && !EMAIL_REGEX.test(email.trim())) {
      setLocalError('Ingresa un correo electronico valido.');
      return;
    }
    if (!isEdit && !password) {
      setLocalError('La contrasena es requerida para crear el usuario.');
      return;
    }
    if (!name.trim() || !lname.trim()) {
      setLocalError('Nombre y apellido son requeridos.');
      return;
    }
    if (!isValidPhone(phoneNum)) {
      setLocalError('Ingresa un telefono valido (al menos 7 digitos).');
      return;
    }
    if (role !== 'CLIENT' && role !== 'ADMIN') {
      setLocalError('Rol invalido.');
      return;
    }
    if (isStudent && (!userCarnet.trim() || !collegeName.trim())) {
      setLocalError('Los estudiantes requieren carnet y universidad.');
      return;
    }

    const payload = {
      password,    // en edit, password vacio = backend conserva el actual
      name:        name.trim(),
      lname:       lname.trim(),
      phoneNum:    phoneNum.trim(),
      role,
      isStudent,
      userCarnet:  isStudent ? userCarnet.trim()  : null,
      collegeName: isStudent ? collegeName.trim() : null,
    };
    if (!isEdit) {
      payload.email = email.trim().toLowerCase();
    }

    await onSubmit(payload);
  };

  const errorBanner = localError ?? submitError;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row g-3">
        <div className="col-md-12">
          <label htmlFor="user-email" className="form-label">Correo electronico</label>
          <input
            id="user-email"
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            autoComplete="off"
            disabled={isEdit}
            required={!isEdit}
          />
          {isEdit && (
            <div className="form-text">
              El correo es la llave primaria del usuario y no se puede modificar.
            </div>
          )}
        </div>

        <div className="col-md-12">
          <label htmlFor="user-password" className="form-label">
            {isEdit ? 'Nueva contrasena' : 'Contrasena'}
            {isEdit && <span className="text-muted-small ms-2">(opcional)</span>}
          </label>
          <input
            id="user-password"
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEdit ? 'Dejar vacio para conservar la actual' : '••••••••'}
            autoComplete="new-password"
          />
        </div>

        <div className="col-md-6">
          <label htmlFor="user-name" className="form-label">Nombre</label>
          <input
            id="user-name"
            type="text"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
        </div>
        <div className="col-md-6">
          <label htmlFor="user-lname" className="form-label">Apellido</label>
          <input
            id="user-lname"
            type="text"
            className="form-control"
            value={lname}
            onChange={(e) => setLname(e.target.value)}
            maxLength={80}
            required
          />
        </div>

        <div className="col-md-6">
          <label htmlFor="user-phone" className="form-label">Telefono</label>
          <input
            id="user-phone"
            type="tel"
            className="form-control"
            value={phoneNum}
            onChange={(e) => setPhoneNum(e.target.value)}
            placeholder="8888-0000"
            maxLength={25}
            required
          />
        </div>
        <div className="col-md-6">
          <label htmlFor="user-role" className="form-label">Rol</label>
          <select
            id="user-role"
            className="form-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="CLIENT">CLIENT</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
      </div>

      <div
        className="mt-3 p-3"
        style={{
          background: 'var(--burgundy-soft, #fdf3f6)',
          border: '1px solid var(--burgundy-line, #e7ccd6)',
          borderRadius: 12,
        }}
      >
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="user-is-student"
            checked={isStudent}
            onChange={(e) => setIsStudent(e.target.checked)}
          />
          <label className="form-check-label fw-semibold" htmlFor="user-is-student">
            <i className="bi bi-mortarboard me-2"></i>Es estudiante universitario
          </label>
        </div>

        {isStudent && (
          <div className="row g-3 mt-1">
            <div className="col-md-6">
              <label htmlFor="user-college" className="form-label">Universidad</label>
              <input
                id="user-college"
                type="text"
                className="form-control"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="TEC Costa Rica"
                maxLength={120}
                required
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="user-carnet" className="form-label">Carnet</label>
              <input
                id="user-carnet"
                type="text"
                className="form-control"
                value={userCarnet}
                onChange={(e) => setUserCarnet(e.target.value)}
                placeholder="2024-0001"
                maxLength={40}
                required
              />
            </div>
          </div>
        )}
      </div>

      {errorBanner && (
        <div className="admin-alert admin-alert-error mt-3" role="alert">
          <i className="bi bi-exclamation-circle-fill"></i>
          <span>{errorBanner}</span>
        </div>
      )}

      <div className="d-flex justify-content-end gap-2 mt-4">
        {onCancel && (
          <button
            type="button"
            className="btn-burgundy-outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="btn-burgundy"
          disabled={submitting}
        >
          {submitting && <span className="spinner-border spinner-border-sm me-2"></span>}
          {isEdit ? 'Guardar cambios' : 'Crear usuario'}
        </button>
      </div>
    </form>
  );
}
