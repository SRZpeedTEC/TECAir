import { useState } from 'react';

import Modal         from '../components/Modal.js';
import ConfirmDialog from '../components/ConfirmDialog.js';
import UserForm      from '../components/UserForm.js';
import {
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  translateUserError,
  splitFullName,
} from '../services/userService.js';

// Mismo patron que el AuthModal cliente para validar formato del input de busqueda.
const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export default function GestionUsuariosPage() {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchedUser, setSearchedUser] = useState(null);
  const [searching,   setSearching]   = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [toast,       setToast]       = useState(null);

  // ─── Crear ───
  const [creating,    setCreating]    = useState(false);
  const [createBusy,  setCreateBusy]  = useState(false);
  const [createError, setCreateError] = useState(null);

  // ─── Editar ───
  const [editing,     setEditing]     = useState(null); // payload con shape de UserForm
  const [editBusy,    setEditBusy]    = useState(false);
  const [editError,   setEditError]   = useState(null);

  // ─── Eliminar ───
  const [deleting,    setDeleting]    = useState(null);
  const [deleteBusy,  setDeleteBusy]  = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // ─── Buscar ───
  const handleSearch = async (e) => {
    e?.preventDefault?.();
    setToast(null);
    setSearchError(null);
    const target = searchEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(target)) {
      setSearchError('Ingresa un correo electronico valido.');
      setSearchedUser(null);
      return;
    }
    setSearching(true);
    try {
      const user = await getUserByEmail(target);
      setSearchedUser(user);
    } catch (err) {
      setSearchedUser(null);
      setSearchError(translateUserError(err.message));
    } finally {
      setSearching(false);
    }
  };

  // ─── Crear ───
  const openCreate = () => {
    setCreateError(null);
    setCreating(true);
  };
  const closeCreate = () => { if (!createBusy) setCreating(false); };

  const handleCreate = async (payload) => {
    setCreateError(null);
    setCreateBusy(true);
    try {
      const created = await createUser(payload);
      setToast(`Usuario "${created.email}" creado correctamente.`);
      setCreating(false);
      // Si la busqueda activa coincide con el creado, lo mostramos.
      if (created.email === searchEmail.trim().toLowerCase()) {
        setSearchedUser(created);
      }
    } catch (err) {
      setCreateError(translateUserError(err.message));
    } finally {
      setCreateBusy(false);
    }
  };

  // ─── Editar ───
  const openEdit = (user) => {
    setEditError(null);
    setToast(null);
    const { name, lname } = splitFullName(user.fullName);
    setEditing({
      email:       user.email,
      name,
      lname,
      phoneNum:    user.phoneNum ?? '',
      role:        user.role     ?? 'CLIENT',
      isStudent:   !!user.isStudent,
      userCarnet:  user.userCarnet  ?? '',
      collegeName: user.collegeName ?? '',
    });
  };
  const closeEdit = () => { if (!editBusy) setEditing(null); };

  const handleEdit = async (payload) => {
    if (!editing) return;
    setEditError(null);
    setEditBusy(true);
    try {
      const updated = await updateUser(editing.email, payload);
      setToast(`Usuario "${updated.email}" actualizado correctamente.`);
      setSearchedUser(updated);
      setEditing(null);
    } catch (err) {
      setEditError(translateUserError(err.message));
    } finally {
      setEditBusy(false);
    }
  };

  // ─── Eliminar ───
  const openDelete = (user) => {
    setDeleteError(null);
    setToast(null);
    setDeleting(user);
  };
  const closeDelete = () => { if (!deleteBusy) { setDeleting(null); setDeleteError(null); } };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);
    setDeleteBusy(true);
    try {
      await deleteUser(deleting.email);
      setToast(`Usuario "${deleting.email}" eliminado correctamente.`);
      setSearchedUser(null);
      setSearchEmail('');
      setDeleting(null);
    } catch (err) {
      setDeleteError(translateUserError(err.message));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div>
      <header className="admin-page-header">
        <h2 className="serif admin-page-title">Gestión de Usuarios</h2>
        <p className="admin-page-subtitle">
          Busca usuarios por correo electrónico para consultar, editar o eliminar su cuenta.
          También puedes registrar nuevos usuarios (clientes o administradores).
        </p>
      </header>

      <div className="admin-alert admin-alert-info mb-3" role="status">
        <i className="bi bi-info-circle-fill"></i>
        <span>
          El backend actual no expone <code>GET /api/users</code> para listar todos los
          registros, por lo que la consulta se hace por correo individual.
        </span>
      </div>

      {toast && (
        <div className="admin-alert admin-alert-success mb-3" role="status">
          <i className="bi bi-check-circle-fill"></i>
          <span>{toast}</span>
        </div>
      )}

      {/* ── Búsqueda ── */}
      <div className="admin-card">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h3 className="serif m-0">Buscar usuario</h3>
          <button
            type="button"
            className="btn-burgundy"
            onClick={openCreate}
          >
            <i className="bi bi-person-plus me-2"></i>
            Crear usuario
          </button>
        </div>

        <form onSubmit={handleSearch} className="row g-2 align-items-end">
          <div className="col-md-9">
            <label htmlFor="search-email" className="form-label">Correo electrónico</label>
            <input
              id="search-email"
              type="email"
              className="form-control"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              autoComplete="off"
            />
          </div>
          <div className="col-md-3 d-grid">
            <button
              type="submit"
              className="btn-burgundy-outline"
              disabled={searching}
            >
              {searching
                ? <><span className="spinner-border spinner-border-sm me-2"></span>Buscando…</>
                : <><i className="bi bi-search me-2"></i>Buscar</>}
            </button>
          </div>
        </form>

        {searchError && (
          <div className="admin-alert admin-alert-error mt-3" role="alert">
            <i className="bi bi-exclamation-circle-fill"></i>
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* ── Resultado ── */}
      {searchedUser && (
        <div className="admin-card mt-3">
          <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
            <div style={{ minWidth: 0 }}>
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <h3 className="serif m-0">{searchedUser.fullName}</h3>
                <span
                  className="flight-state-badge"
                  style={{
                    background: searchedUser.role === 'ADMIN' ? '#f4e7d8' : '#e8eef8',
                    color:      searchedUser.role === 'ADMIN' ? '#7a4a14' : '#1d3a7a',
                    border:     '1px solid currentColor',
                  }}
                >
                  <i className={`bi bi-${searchedUser.role === 'ADMIN' ? 'shield-lock' : 'person'} me-1`}></i>
                  {searchedUser.role}
                </span>
                {searchedUser.isStudent && (
                  <span
                    className="flight-state-badge"
                    style={{
                      background: '#e6f4ec',
                      color:      '#1f6d3f',
                      border:     '1px solid currentColor',
                    }}
                  >
                    <i className="bi bi-mortarboard me-1"></i>Estudiante
                  </span>
                )}
              </div>
              <div className="text-muted-small mono">{searchedUser.email}</div>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="flight-action-btn"
                onClick={() => openEdit(searchedUser)}
                title="Editar usuario"
                aria-label={`Editar usuario ${searchedUser.email}`}
              >
                <i className="bi bi-pencil"></i>
              </button>
              <button
                type="button"
                className="flight-action-btn flight-action-danger"
                onClick={() => openDelete(searchedUser)}
                title="Eliminar usuario"
                aria-label={`Eliminar usuario ${searchedUser.email}`}
              >
                <i className="bi bi-trash"></i>
              </button>
            </div>
          </div>

          <div className="row g-3 mt-2">
            <InfoCell icon="telephone" label="Teléfono" value={searchedUser.phoneNum} />
            <InfoCell
              icon="building"
              label="Universidad"
              value={searchedUser.collegeName ?? '—'}
            />
            <InfoCell
              icon="credit-card-2-front"
              label="Carnet"
              value={searchedUser.userCarnet ?? '—'}
            />
            <InfoCell
              icon="stars"
              label="Millas"
              value={searchedUser.isStudent ? (searchedUser.miles ?? 0) : '—'}
            />
          </div>
        </div>
      )}

      {/* ── Modal: Crear ── */}
      <Modal
        open={creating}
        onClose={closeCreate}
        title="Crear usuario"
        size="md"
      >
        <UserForm
          mode="create"
          onSubmit={handleCreate}
          onCancel={closeCreate}
          submitting={createBusy}
          submitError={createError}
        />
      </Modal>

      {/* ── Modal: Editar ── */}
      <Modal
        open={!!editing}
        onClose={closeEdit}
        title={editing ? `Editar "${editing.email}"` : ''}
        size="md"
      >
        {editing && (
          <UserForm
            mode="edit"
            initialValues={editing}
            onSubmit={handleEdit}
            onCancel={closeEdit}
            submitting={editBusy}
            submitError={editError}
          />
        )}
      </Modal>

      {/* ── Confirmar eliminación ── */}
      <ConfirmDialog
        open={!!deleting}
        onCancel={closeDelete}
        onConfirm={handleDelete}
        title="Eliminar usuario"
        destructive
        loading={deleteBusy}
        error={deleteError}
        confirmLabel="Eliminar usuario"
        message={
          deleting && (
            <>
              <p className="m-0">
                Vas a eliminar al usuario <strong>"{deleting.fullName}"</strong> ({deleting.email}).
              </p>
              <p className="m-0 mt-2 text-muted-small">
                Esta acción no puede deshacerse. Si el usuario tiene reservaciones, el backend
                impedirá la eliminación por integridad histórica.
              </p>
            </>
          )
        }
      />
    </div>
  );
}

function InfoCell({ icon, label, value }) {
  return (
    <div className="col-sm-6 col-lg-3">
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--line, #eadfe3)',
          borderRadius: 12,
          padding: '12px 14px',
          height: '100%',
        }}
      >
        <div
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--muted, #7a6d72)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <i className={`bi bi-${icon}`}></i>
          {label}
        </div>
        <div style={{ marginTop: 4, fontWeight: 500, wordBreak: 'break-word' }}>
          {value ?? '—'}
        </div>
      </div>
    </div>
  );
}
