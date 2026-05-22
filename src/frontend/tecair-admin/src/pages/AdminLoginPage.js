import { useState } from 'react';

import { loginAdmin, translateLoginError } from '../services/authService.js';

const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

// Pantalla de login obligatoria al entrar a la Vista Aeropuerto.
// Rechaza usuarios cuyo rol no sea ADMIN. La verificacion del rol ocurre solo
// en el cliente porque hoy no hay middleware de autorizacion en el backend.
//
// Props:
//   onLogin — (user) => void. Se invoca solo cuando el login es exitoso y el rol es ADMIN.
export default function AdminLoginPage({ onLogin }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const target = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(target)) {
      setError('Ingresa un correo electronico valido.');
      return;
    }
    if (!password) {
      setError('La contrasena es requerida.');
      return;
    }

    setBusy(true);
    try {
      const user = await loginAdmin(target, password);
      if (user.role !== 'ADMIN') {
        setError('Esta cuenta no tiene permisos de administrador.');
        return;
      }
      onLogin(user);
    } catch (err) {
      setError(translateLoginError(err.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, #2a0e1c 0%, #4a1530 60%, #6b2545 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#fff',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 32px 80px rgba(20,5,15,0.45)',
        }}
      >
        <div className="text-center mb-4">
          <div
            className="brand-mark"
            style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.02em' }}
          >
            Air<span className="accent">TEC</span>
          </div>
          <div style={{ color: 'var(--muted, #7a6d72)', fontSize: 14, marginTop: 4 }}>
            Vista Aeropuerto · Acceso administrativo
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          <div className="mb-3">
            <label htmlFor="admin-login-email" className="form-label">
              Correo electronico
            </label>
            <input
              id="admin-login-email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@tecair.com"
              autoComplete="off"
              autoFocus
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="admin-login-password" className="form-label">
              Contrasena
            </label>
            <input
              id="admin-login-password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <div className="admin-alert admin-alert-error mb-3" role="alert">
              <i className="bi bi-exclamation-circle-fill"></i>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn-burgundy w-100"
            disabled={busy}
          >
            {busy && <span className="spinner-border spinner-border-sm me-2"></span>}
            <i className="bi bi-box-arrow-in-right me-2"></i>
            Iniciar sesion
          </button>
        </form>

        <div
          className="text-center mt-3"
          style={{ fontSize: 12, color: 'var(--muted, #7a6d72)' }}
        >
          Solo cuentas con rol <strong>ADMIN</strong> pueden acceder.
        </div>
      </div>
    </div>
  );
}
