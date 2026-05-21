import { useEffect, useState } from 'react';
import { loginUser, registerUser } from '../services/userService.js';

// Modal de autenticación con dos pestañas: iniciar sesión y crear cuenta.
// Props:
//   show       – booleano que controla visibilidad
//   onClose    – callback al cerrar sin autenticarse
//   onSuccess  – callback(user) llamado tras login/registro exitoso
export default function AuthModal({ show, onClose, onSuccess }) {
  const [tab, setTab] = useState('login');

  // campos login
  const [loginEmail,    setLoginEmail]    = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // campos registro
  const [name,       setName]       = useState('');
  const [lname,      setLname]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [regEmail,   setRegEmail]   = useState('');
  const [regPass,    setRegPass]    = useState('');
  const [isStudent,  setIsStudent]  = useState(false);
  const [college,    setCollege]    = useState('');
  const [carnet,     setCarnet]     = useState('');

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Cada vez que el modal se cierra resetamos todos los campos para que la proxima
  // apertura aparezca en blanco (sin filtrar lo que el usuario tipeo antes).
  useEffect(() => {
    if (show) return;
    setTab('login');
    setLoginEmail(''); setLoginPassword('');
    setName(''); setLname(''); setPhone('');
    setRegEmail(''); setRegPass('');
    setIsStudent(false); setCollege(''); setCarnet('');
    setLoading(false);
    setError('');
  }, [show]);

  if (!show) return null;

  const switchTab = (t) => { setTab(t); setError(''); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await loginUser(loginEmail, loginPassword);
      onSuccess(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await registerUser({
        email:       regEmail,
        password:    regPass,
        name,
        lname,
        phoneNum:    phone,
        role:        'CLIENT',
        isStudent,
        collegeName: isStudent ? college : null,
        userCarnet:  isStudent ? carnet  : null,
      });
      onSuccess(user);
    } catch (err) {
      setError(err.message);
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '440px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 32px 80px rgba(40,10,25,0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Cabecera ── */}
        <div style={{ padding: '24px 28px 0' }}>
          <div className="d-flex justify-content-between align-items-center">
            <span className="brand-mark" style={{ fontSize: '22px' }}>
              Air<span className="accent">TEC</span>
            </span>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--muted)', cursor: 'pointer', lineHeight: 1 }}
              aria-label="Cerrar"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {/* Pestañas */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginTop: '20px' }}>
            {[['login', 'Iniciar sesión'], ['register', 'Crear cuenta']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  border: 'none',
                  background: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  color: tab === key ? 'var(--burgundy)' : 'var(--muted)',
                  borderBottom: `3px solid ${tab === key ? 'var(--burgundy)' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'color .15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Cuerpo ── */}
        <div style={{ padding: '24px 28px 28px' }}>
          {error && (
            <div
              className="d-flex align-items-center gap-2 mb-3 px-3 py-2"
              style={{ background: '#fff1f4', border: '1px solid #f5c2cc', borderRadius: '10px', fontSize: '0.9rem', color: '#8b1a2e' }}
            >
              <i className="bi bi-exclamation-circle-fill"></i>
              <span>{error}</span>
            </div>
          )}

          {/* ── Formulario: Iniciar sesión ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin}>
              <FieldLabel>Correo electrónico</FieldLabel>
              <input
                type="email" className="form-control mb-3" style={{ borderRadius: '10px' }}
                placeholder="correo@ejemplo.com"
                value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                required
              />

              <FieldLabel>Contraseña</FieldLabel>
              <input
                type="password" className="form-control mb-4" style={{ borderRadius: '10px' }}
                placeholder="••••••••"
                value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                required
              />

              <button type="submit" className="btn btn-burgundy w-100" disabled={loading}>
                {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
                Iniciar sesión
              </button>

              <p className="text-center text-muted mt-3 mb-0" style={{ fontSize: '0.88rem' }}>
                ¿No tienes cuenta?{' '}
                <span
                  style={{ color: 'var(--burgundy)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => switchTab('register')}
                >
                  Créala aquí
                </span>
              </p>
            </form>
          )}

          {/* ── Formulario: Crear cuenta ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister}>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <FieldLabel>Nombre</FieldLabel>
                  <input
                    type="text" className="form-control" style={{ borderRadius: '10px' }}
                    placeholder="Santiago"
                    value={name} onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="col-6">
                  <FieldLabel>Apellido</FieldLabel>
                  <input
                    type="text" className="form-control" style={{ borderRadius: '10px' }}
                    placeholder="Robles"
                    value={lname} onChange={(e) => setLname(e.target.value)}
                    required
                  />
                </div>
              </div>

              <FieldLabel>Teléfono</FieldLabel>
              <input
                type="tel" className="form-control mb-3" style={{ borderRadius: '10px' }}
                placeholder="8888-0000"
                value={phone} onChange={(e) => setPhone(e.target.value)}
                required
              />

              <FieldLabel>Correo electrónico</FieldLabel>
              <input
                type="email" className="form-control mb-3" style={{ borderRadius: '10px' }}
                placeholder="correo@ejemplo.com"
                value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                required
              />

              <FieldLabel>Contraseña</FieldLabel>
              <input
                type="password" className="form-control mb-3" style={{ borderRadius: '10px' }}
                placeholder="••••••••"
                value={regPass} onChange={(e) => setRegPass(e.target.value)}
                required
              />

              {/* Bloque estudiante */}
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
                    className="form-check-input" type="checkbox" id="chk-student"
                    checked={isStudent} onChange={(e) => setIsStudent(e.target.checked)}
                    style={{ accentColor: 'var(--burgundy)' }}
                  />
                  <label className="form-check-label fw-semibold" htmlFor="chk-student" style={{ cursor: 'pointer' }}>
                    <i className="bi bi-mortarboard me-2 text-burgundy"></i>
                    Soy estudiante universitario
                  </label>
                </div>

                {isStudent && (
                  <div className="mt-3 d-flex flex-column gap-2">
                    <div>
                      <FieldLabel>Universidad</FieldLabel>
                      <input
                        type="text" className="form-control" style={{ borderRadius: '10px' }}
                        placeholder="TEC Costa Rica"
                        value={college} onChange={(e) => setCollege(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <FieldLabel>Carnet estudiantil</FieldLabel>
                      <input
                        type="text" className="form-control" style={{ borderRadius: '10px' }}
                        placeholder="2024-0001"
                        value={carnet} onChange={(e) => setCarnet(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-burgundy w-100" disabled={loading}>
                {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
                Crear cuenta
              </button>

              <p className="text-center text-muted mt-3 mb-0" style={{ fontSize: '0.88rem' }}>
                ¿Ya tienes cuenta?{' '}
                <span
                  style={{ color: 'var(--burgundy)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => switchTab('login')}
                >
                  Inicia sesión
                </span>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label
      className="form-label mb-1"
      style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', fontWeight: 600 }}
    >
      {children}
    </label>
  );
}
