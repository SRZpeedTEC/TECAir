import { useEffect, useState } from 'react';
import { getUserByEmail, updateUser } from '../services/userService.js';

// Modal de edición de perfil para el usuario autenticado.
// Permite cambiar nombre, apellido, teléfono, contraseña y estado de estudiante.
export default function ProfileModal({ show, onClose, currentUser, onSuccess }) {
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error,    setError]    = useState('');
  const [saved,    setSaved]    = useState(false);

  const [name,      setName]      = useState('');
  const [lname,     setLname]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [isStudent, setIsStudent] = useState(false);
  const [college,   setCollege]   = useState('');
  const [carnet,    setCarnet]    = useState('');

  // Carga los datos actuales del usuario cuando el modal se abre.
  // getUserByEmail trae phoneNum, que loginUser no devuelve.
  useEffect(() => {
    if (!show || !currentUser?.email) return;

    setSaved(false);
    setError('');
    setPassword('');
    setPassword2('');

    setFetching(true);
    getUserByEmail(currentUser.email)
      .then((u) => {
        // fullName = "Name Lname"; tomamos la primera palabra como nombre
        // y el resto como apellido (mejor aproximación sin cambiar el backend).
        const parts = (u.fullName ?? '').trim().split(/\s+/);
        setName(parts[0] ?? '');
        setLname(parts.slice(1).join(' '));
        setPhone(u.phoneNum ?? '');
        setIsStudent(u.isStudent ?? false);
        setCollege(u.collegeName ?? '');
        setCarnet(u.userCarnet  ?? '');
      })
      .catch(() => setError('No se pudieron cargar los datos del perfil.'))
      .finally(() => setFetching(false));
  }, [show, currentUser?.email]);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password && password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password && password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const updated = await updateUser(currentUser.email, {
        password:    password.trim(),   // vacío = el backend conserva el hash actual
        name:        name.trim(),
        lname:       lname.trim(),
        phoneNum:    phone.trim(),
        role:        'CLIENT',
        isStudent,
        collegeName: isStudent ? college.trim() : null,
        userCarnet:  isStudent ? carnet.trim()  : null,
      });
      setSaved(true);
      onSuccess(updated);
    } catch (err) {
      setError(err.message || 'No se pudo guardar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(26,19,32,0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 32px 80px rgba(40,10,25,0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Cabecera ── */}
        <div style={{ padding: '24px 28px 0' }}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <div className="brand-mark" style={{ fontSize: '20px' }}>
                Air<span className="accent">TEC</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 2 }}>
                {currentUser?.email}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--muted)', cursor: 'pointer' }}
              aria-label="Cerrar"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <h6 className="serif mt-3 mb-0" style={{ fontSize: '1.1rem', color: 'var(--ink)' }}>
            Editar perfil
          </h6>
          <div style={{ borderBottom: '1px solid var(--line)', marginTop: '14px' }}></div>
        </div>

        {/* ── Cuerpo ── */}
        <div style={{ padding: '20px 28px 28px' }}>
          {fetching && (
            <div className="text-center text-muted py-3">
              <span className="spinner-border spinner-border-sm me-2"></span>
              Cargando perfil…
            </div>
          )}

          {saved && (
            <div
              className="d-flex align-items-center gap-2 mb-3 px-3 py-2"
              style={{ background: '#f0faf4', border: '1px solid #a8dfc0', borderRadius: '10px', fontSize: '0.9rem', color: '#2d7a4f' }}
            >
              <i className="bi bi-check-circle-fill"></i>
              <span>Perfil actualizado correctamente.</span>
            </div>
          )}

          {error && (
            <div
              className="d-flex align-items-center gap-2 mb-3 px-3 py-2"
              style={{ background: '#fff1f4', border: '1px solid #f5c2cc', borderRadius: '10px', fontSize: '0.9rem', color: '#8b1a2e' }}
            >
              <i className="bi bi-exclamation-circle-fill"></i>
              <span>{error}</span>
            </div>
          )}

          {!fetching && (
            <form onSubmit={handleSubmit} autoComplete="off">
              {/* Nombre y apellido */}
              <div className="row g-2 mb-3">
                <div className="col-12 col-sm-6">
                  <FL>Nombre</FL>
                  <input
                    type="text" className="form-control" style={{ borderRadius: '10px' }}
                    value={name} onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <FL>Apellido</FL>
                  <input
                    type="text" className="form-control" style={{ borderRadius: '10px' }}
                    value={lname} onChange={(e) => setLname(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Teléfono */}
              <FL>Teléfono</FL>
              <input
                type="tel" className="form-control mb-3" style={{ borderRadius: '10px' }}
                value={phone} onChange={(e) => setPhone(e.target.value)}
                required
              />

              {/* Contraseña */}
              <div
                style={{
                  background: 'var(--burgundy-soft)',
                  border: '1px solid var(--burgundy-line)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                }}
              >
                <div className="small fw-semibold mb-2" style={{ color: 'var(--burgundy)' }}>
                  <i className="bi bi-lock me-2"></i>Cambiar contraseña
                  <span className="fw-normal text-muted ms-2">(dejar vacío para no cambiarla)</span>
                </div>
                <FL>Nueva contraseña</FL>
                <input
                  type="password" className="form-control mb-2" style={{ borderRadius: '10px' }}
                  placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <FL>Confirmar contraseña</FL>
                <input
                  type="password" className="form-control" style={{ borderRadius: '10px' }}
                  placeholder="••••••••"
                  value={password2} onChange={(e) => setPassword2(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              {/* Estudiante */}
              <div
                style={{
                  background: 'var(--burgundy-soft)',
                  border: '1px solid var(--burgundy-line)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  marginBottom: '20px',
                }}
              >
                <div className="form-check mb-0">
                  <input
                    className="form-check-input" type="checkbox" id="chk-student-profile"
                    checked={isStudent} onChange={(e) => setIsStudent(e.target.checked)}
                    style={{ accentColor: 'var(--burgundy)' }}
                  />
                  <label className="form-check-label fw-semibold" htmlFor="chk-student-profile" style={{ cursor: 'pointer' }}>
                    <i className="bi bi-mortarboard me-2 text-burgundy"></i>
                    Soy estudiante universitario
                  </label>
                </div>

                {isStudent && (
                  <div className="mt-3 d-flex flex-column gap-2">
                    <div>
                      <FL>Universidad</FL>
                      <input
                        type="text" className="form-control" style={{ borderRadius: '10px' }}
                        placeholder="TEC Costa Rica"
                        value={college} onChange={(e) => setCollege(e.target.value)}
                        required={isStudent}
                      />
                    </div>
                    <div>
                      <FL>Carnet estudiantil</FL>
                      <input
                        type="text" className="form-control" style={{ borderRadius: '10px' }}
                        placeholder="2024-0001"
                        value={carnet} onChange={(e) => setCarnet(e.target.value)}
                        required={isStudent}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="d-flex gap-2">
                <button
                  type="button" className="btn btn-burgundy-outline flex-fill"
                  onClick={onClose} disabled={loading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-burgundy flex-fill" disabled={loading || fetching}>
                  {loading
                    ? <><span className="spinner-border spinner-border-sm me-2"></span>Guardando…</>
                    : <><i className="bi bi-check2 me-2"></i>Guardar cambios</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function FL({ children }) {
  return (
    <label
      className="form-label mb-1"
      style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', fontWeight: 600 }}
    >
      {children}
    </label>
  );
}
