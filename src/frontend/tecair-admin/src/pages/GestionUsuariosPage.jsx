import { useState } from 'react';

import ConfirmDialog from '../components/ConfirmDialog.jsx';
import {
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
} from '../services/userService.js';

const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

const TABS = [
  { id: 'manage', label: 'Consultar / Editar', icon: 'bi-search' },
  { id: 'create', label: 'Crear usuario', icon: 'bi-person-plus' },
];

const EMPTY_FORM = {
  email: '',
  password: '',
  name: '',
  lname: '',
  phoneNum: '',
  role: 'CLIENT',
  isStudent: false,
  userCarnet: '',
  collegeName: '',
};

// Mapea UserResponse (lo que devuelve el backend) al estado del formulario.
// password queda vacio: en edicion, blank = "no cambiar la contrasena".
function userResponseToForm(user) {
  const [firstName, ...rest] = (user.fullName ?? '').split(' ');
  return {
    email: user.email ?? '',
    password: '',
    name: firstName ?? '',
    lname: rest.join(' '),
    phoneNum: user.phoneNum ?? '',
    role: user.role ?? 'CLIENT',
    isStudent: !!user.isStudent,
    userCarnet: user.userCarnet ?? '',
    collegeName: user.collegeName ?? '',
  };
}

export default function GestionUsuariosPage() {
  const [activeTab, setActiveTab] = useState('manage');

  return (
    <div>
      <header className="admin-page-header">
        <h2 className="serif admin-page-title">Gestión de Usuarios</h2>
        <p className="admin-page-subtitle">
          Crear, consultar, editar y eliminar usuarios del sistema. La busqueda se hace por
          correo electronico exacto. Los usuarios con reservaciones activas no pueden eliminarse.
        </p>
      </header>

      <nav className="admin-sub-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={'admin-sub-nav-btn' + (activeTab === t.id ? ' active' : '')}
            onClick={() => setActiveTab(t.id)}
          >
            <i className={`bi ${t.icon}`}></i>
            {t.label}
          </button>
        ))}
      </nav>

      {activeTab === 'manage' && <ManageUsersTab />}
      {activeTab === 'create' && <CreateUserTab />}
    </div>
  );
}

// ─── Tab Consultar / Editar / Eliminar ───────────────────────────────────────
function ManageUsersTab() {
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Usuario cargado del backend (no se muta). Es la "fuente de verdad" para email/PK.
  const [loadedUser, setLoadedUser] = useState(null);

  // Form en edicion. Inicialmente igual a loadedUser; el usuario puede ir modificandolo.
  const [form, setForm] = useState(EMPTY_FORM);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [toast, setToast] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchError(null);
    setToast(null);
    setSubmitError(null);

    const target = searchEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(target)) {
      setSearchError('Ingresa un correo electronico valido.');
      return;
    }

    setSearching(true);
    try {
      const user = await getUserByEmail(target);
      setLoadedUser(user);
      setForm(userResponseToForm(user));
    } catch (err) {
      setLoadedUser(null);
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    setSearchEmail('');
    setLoadedUser(null);
    setForm(EMPTY_FORM);
    setSearchError(null);
    setSubmitError(null);
    setToast(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loadedUser) return;

    setSubmitError(null);
    setToast(null);

    const payload = {
      // Si el campo password viene vacio, no se actualiza la contrasena (el servicio lo respeta).
      password: form.password,
      name: form.name.trim(),
      lname: form.lname.trim(),
      phoneNum: form.phoneNum.trim(),
      role: form.role,
      isStudent: form.isStudent,
      userCarnet: form.isStudent ? form.userCarnet.trim() : null,
      collegeName: form.isStudent ? form.collegeName.trim() : null,
    };

    setSubmitting(true);
    try {
      const updated = await updateUser(loadedUser.email, payload);
      setLoadedUser(updated);
      setForm(userResponseToForm(updated));
      setToast(`Usuario "${updated.email}" actualizado correctamente.`);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!loadedUser) return;
    setDeletingBusy(true);
    setDeleteError(null);
    try {
      await deleteUser(loadedUser.email);
      const removedEmail = loadedUser.email;
      setConfirmDelete(false);
      setLoadedUser(null);
      setSearchEmail('');
      setForm(EMPTY_FORM);
      setToast(`Usuario "${removedEmail}" eliminado correctamente.`);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div>
      <div className="admin-card mb-3">
        <h3 className="serif m-0 mb-3">Buscar usuario</h3>
        <form onSubmit={handleSearch} className="d-flex flex-wrap gap-2 align-items-end">
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <label htmlFor="user-search-email" className="form-label">
              Correo electronico
            </label>
            <input
              id="user-search-email"
              type="email"
              className="form-control"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn-burgundy" disabled={searching}>
            {searching && <span className="spinner-border spinner-border-sm me-2"></span>}
            <i className="bi bi-search me-2"></i>
            Buscar
          </button>
          {(loadedUser || searchEmail) && (
            <button
              type="button"
              className="btn-burgundy-outline"
              onClick={handleClear}
              disabled={searching}
            >
              Limpiar
            </button>
          )}
        </form>

        {searchError && (
          <div className="admin-alert admin-alert-error mt-3" role="alert">
            <i className="bi bi-exclamation-circle-fill"></i>
            <span>{searchError}</span>
          </div>
        )}

        {toast && (
          <div className="admin-alert admin-alert-success mt-3" role="status">
            <i className="bi bi-check-circle-fill"></i>
            <span>{toast}</span>
          </div>
        )}
      </div>

      {loadedUser && (
        <div className="admin-card">
          <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
            <div>
              <h3 className="serif m-0">{loadedUser.fullName}</h3>
              <div className="text-muted-small mt-1">
                <i className="bi bi-envelope me-1"></i>
                {loadedUser.email}
                <span className="mx-2">·</span>
                <i className="bi bi-shield-lock me-1"></i>
                {loadedUser.role}
                {loadedUser.isStudent && (
                  <>
                    <span className="mx-2">·</span>
                    <i className="bi bi-mortarboard me-1"></i>
                    Estudiante
                  </>
                )}
                {typeof loadedUser.miles === 'number' && (
                  <>
                    <span className="mx-2">·</span>
                    <i className="bi bi-airplane me-1"></i>
                    {loadedUser.miles} millas
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              className="btn-danger-burgundy"
              onClick={() => { setDeleteError(null); setConfirmDelete(true); }}
              disabled={submitting}
            >
              <i className="bi bi-trash me-2"></i>
              Eliminar usuario
            </button>
          </div>

          <UserFormFields
            mode="edit"
            form={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitError={submitError}
            submitLabel="Guardar cambios"
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => { setConfirmDelete(false); setDeleteError(null); }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar usuario"
        destructive
        loading={deletingBusy}
        error={deleteError}
        confirmLabel="Eliminar usuario"
        message={
          loadedUser && (
            <>
              <p className="m-0">
                Vas a eliminar al usuario <strong>"{loadedUser.email}"</strong>.
              </p>
              <p className="m-0 mt-2 text-muted-small">
                Esta accion no puede deshacerse. Si el usuario tiene reservaciones asociadas
                el backend rechazara la operacion.
              </p>
            </>
          )
        }
      />
    </div>
  );
}

// ─── Tab Crear ──────────────────────────────────────────────────────────────
function CreateUserTab() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setToast(null);

    const email = form.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      setSubmitError('Ingresa un correo electronico valido.');
      return;
    }
    if (!form.password) {
      setSubmitError('La contrasena es requerida.');
      return;
    }

    const payload = {
      email,
      password: form.password,
      name: form.name.trim(),
      lname: form.lname.trim(),
      phoneNum: form.phoneNum.trim(),
      role: form.role,
      isStudent: form.isStudent,
      userCarnet: form.isStudent ? form.userCarnet.trim() : null,
      collegeName: form.isStudent ? form.collegeName.trim() : null,
    };

    setSubmitting(true);
    try {
      const created = await createUser(payload);
      setToast(`Usuario "${created.email}" creado correctamente.`);
      setForm(EMPTY_FORM);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-card">
      <h3 className="serif m-0 mb-3">Nuevo usuario</h3>

      {toast && (
        <div className="admin-alert admin-alert-success mb-3" role="status">
          <i className="bi bi-check-circle-fill"></i>
          <span>{toast}</span>
        </div>
      )}

      <UserFormFields
        mode="create"
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
        submitLabel="Crear usuario"
      />
    </div>
  );
}

// ─── Form compartido entre crear y editar ────────────────────────────────────
function UserFormFields({ mode, form, onChange, onSubmit, submitting, submitError, submitLabel }) {
  const update = (patch) => onChange({ ...form, ...patch });
  const isCreate = mode === 'create';

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="row g-3">
        {isCreate && (
          <div className="col-md-6">
            <label htmlFor="user-form-email" className="form-label">
              Correo electronico
            </label>
            <input
              id="user-form-email"
              type="email"
              className="form-control"
              value={form.email}
              onChange={(e) => update({ email: e.target.value })}
              autoComplete="off"
              required
            />
          </div>
        )}

        <div className={isCreate ? 'col-md-6' : 'col-md-6'}>
          <label htmlFor="user-form-password" className="form-label">
            Contrasena
            {!isCreate && (
              <span className="text-muted-small ms-2">(dejar en blanco para no cambiar)</span>
            )}
          </label>
          <input
            id="user-form-password"
            type="password"
            className="form-control"
            value={form.password}
            onChange={(e) => update({ password: e.target.value })}
            autoComplete="new-password"
            required={isCreate}
          />
        </div>

        <div className="col-md-6">
          <label htmlFor="user-form-name" className="form-label">Nombre</label>
          <input
            id="user-form-name"
            type="text"
            className="form-control"
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            required
          />
        </div>

        <div className="col-md-6">
          <label htmlFor="user-form-lname" className="form-label">Apellidos</label>
          <input
            id="user-form-lname"
            type="text"
            className="form-control"
            value={form.lname}
            onChange={(e) => update({ lname: e.target.value })}
            required
          />
        </div>

        <div className="col-md-6">
          <label htmlFor="user-form-phone" className="form-label">Telefono</label>
          <input
            id="user-form-phone"
            type="tel"
            className="form-control"
            value={form.phoneNum}
            onChange={(e) => update({ phoneNum: e.target.value })}
            required
          />
        </div>

        <div className="col-md-6">
          <label htmlFor="user-form-role" className="form-label">Rol</label>
          <select
            id="user-form-role"
            className="form-select"
            value={form.role}
            onChange={(e) => update({ role: e.target.value })}
          >
            <option value="CLIENT">CLIENT</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>

        <div className="col-12">
          <div className="form-check">
            <input
              id="user-form-student"
              type="checkbox"
              className="form-check-input"
              checked={form.isStudent}
              onChange={(e) => update({ isStudent: e.target.checked })}
            />
            <label htmlFor="user-form-student" className="form-check-label">
              Es estudiante
            </label>
          </div>
        </div>

        {form.isStudent && (
          <>
            <div className="col-md-6">
              <label htmlFor="user-form-carnet" className="form-label">Carnet</label>
              <input
                id="user-form-carnet"
                type="text"
                className="form-control"
                value={form.userCarnet}
                onChange={(e) => update({ userCarnet: e.target.value })}
                required
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="user-form-college" className="form-label">Institucion</label>
              <input
                id="user-form-college"
                type="text"
                className="form-control"
                value={form.collegeName}
                onChange={(e) => update({ collegeName: e.target.value })}
                required
              />
            </div>
          </>
        )}
      </div>

      {submitError && (
        <div className="admin-alert admin-alert-error mt-3" role="alert">
          <i className="bi bi-exclamation-circle-fill"></i>
          <span>{submitError}</span>
        </div>
      )}

      <div className="d-flex justify-content-end mt-4">
        <button type="submit" className="btn-burgundy" disabled={submitting}>
          {submitting && <span className="spinner-border spinner-border-sm me-2"></span>}
          <i className={`bi ${isCreate ? 'bi-person-plus' : 'bi-check2'} me-2`}></i>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
