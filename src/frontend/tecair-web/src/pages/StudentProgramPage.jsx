import { useState } from 'react';
import Nav from '../components/Nav.jsx';
import { enrollAsStudent } from '../services/userService.js';

// Página del programa de lealtad estudiantil.
// Si el usuario está logueado y es estudiante, confirma su inscripción.
// Si está logueado pero no es estudiante, muestra el formulario de enroll.
export default function StudentProgramPage({ currentUser, onOpenAuth, onLogout, onStudentProgram, goHome, goToMisViajes, onUserUpdate, onEditProfile }) {
  const isEnrolled = currentUser?.isStudent === true;

  const [college,   setCollege]   = useState('');
  const [carnet,    setCarnet]    = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const handleEnroll = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const updated = await enrollAsStudent(currentUser.email, college, carnet);
      onUserUpdate(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav
        onLogoClick={goHome}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
        onStudentProgram={() => {}}
        onMisViajes={goToMisViajes}
        onEditProfile={onEditProfile}
        currentUser={currentUser}
      />

      <div className="container" style={{ paddingTop: '48px', paddingBottom: '64px', maxWidth: '680px' }}>

        {/* ── Encabezado ── */}
        <div className="d-flex align-items-center gap-3 mb-4">
          <div
            style={{
              width: 56, height: 56,
              background: 'var(--burgundy-soft)',
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="bi bi-mortarboard-fill text-burgundy" style={{ fontSize: '1.6rem' }}></i>
          </div>
          <div>
            <h1 className="serif mb-0" style={{ fontSize: '1.9rem' }}>Student Program</h1>
            <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
              Acumula millas con cada vuelo durante tus estudios.
            </p>
          </div>
        </div>

        {/* ── Caso: estudiante inscrito ── */}
        {isEnrolled && (
          <>
            {/* Badge de inscripción */}
            <div
              style={{
                background: '#f0faf4',
                border: '1px solid #a8dfc0',
                borderRadius: '16px',
                padding: '20px 24px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: 44, height: 44, flexShrink: 0,
                  background: '#2d7a4f',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i className="bi bi-check-lg" style={{ color: '#fff', fontSize: '1.3rem' }}></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a4a2e' }}>
                  Inscrito en el Student Program
                </div>
                <div style={{ fontSize: '0.88rem', color: '#2d7a4f', marginTop: '2px' }}>
                  Tu cuenta está activa y acumulando millas.
                </div>
              </div>
            </div>

            {/* Datos del estudiante */}
            <div
              style={{
                background: '#fff',
                border: '1px solid var(--line)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}
            >
              <h6 className="serif mb-3" style={{ fontSize: '1.1rem', color: 'var(--burgundy)' }}>
                Información de tu cuenta
              </h6>
              <div className="d-flex flex-column gap-3">
                <InfoRow icon="person" label="Nombre" value={currentUser.fullName} />
                <InfoRow icon="envelope" label="Correo" value={currentUser.email} />
                <InfoRow icon="building" label="Universidad" value={currentUser.collegeName ?? '—'} />
                <InfoRow icon="credit-card-2-front" label="Carnet" value={currentUser.userCarnet ?? '—'} />
                <InfoRow
                  icon="stars"
                  label="Millas acumuladas"
                  value={
                    <span style={{ fontWeight: 700, color: 'var(--burgundy)', fontSize: '1.05rem' }}>
                      {currentUser.miles ?? 0} millas
                    </span>
                  }
                />
              </div>
            </div>

            {/* Aviso de funcionalidad próxima */}
            <div
              style={{
                background: 'var(--burgundy-soft)',
                border: '1px solid var(--burgundy-line)',
                borderRadius: '12px',
                padding: '14px 18px',
                fontSize: '0.88rem',
                color: 'var(--burgundy)',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
              }}
            >
              <i className="bi bi-info-circle-fill" style={{ flexShrink: 0, marginTop: '1px' }}></i>
              <span>
                El historial de vuelos y canje de millas estará disponible próximamente.
              </span>
            </div>
          </>
        )}

        {/* ── Caso: no es estudiante (pero sí está logueado) ── */}
        {currentUser && !isEnrolled && (
          <div
            style={{
              background: '#fff',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              padding: '28px',
            }}
          >
            <div className="d-flex align-items-center gap-3 mb-4">
              <div
                style={{
                  width: 44, height: 44, flexShrink: 0,
                  background: 'var(--burgundy-soft)',
                  borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i className="bi bi-mortarboard-fill text-burgundy" style={{ fontSize: '1.3rem' }}></i>
              </div>
              <div>
                <h5 className="serif mb-0" style={{ fontSize: '1.2rem' }}>Inscríbete al Student Program</h5>
                <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>
                  Acumula millas en cada vuelo durante tus estudios.
                </p>
              </div>
            </div>

            {error && (
              <div
                className="d-flex align-items-center gap-2 mb-3 px-3 py-2"
                style={{ background: '#fff1f4', border: '1px solid #f5c2cc', borderRadius: '10px', fontSize: '0.9rem', color: '#8b1a2e' }}
              >
                <i className="bi bi-exclamation-circle-fill"></i>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleEnroll}>
              <div className="mb-3">
                <label
                  className="form-label mb-1"
                  style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', fontWeight: 600 }}
                >
                  Universidad
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ borderRadius: '10px' }}
                  placeholder="TEC Costa Rica"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  className="form-label mb-1"
                  style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', fontWeight: 600 }}
                >
                  Carnet estudiantil
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ borderRadius: '10px' }}
                  placeholder="2024-0001"
                  value={carnet}
                  onChange={(e) => setCarnet(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-burgundy" disabled={loading}>
                {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
                <i className="bi bi-mortarboard me-2"></i>Inscribirme
              </button>
            </form>
          </div>
        )}

        {/* ── Caso: no hay sesión ── */}
        {!currentUser && (
          <div
            style={{
              background: '#fff',
              border: '1px solid var(--line)',
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <i className="bi bi-person-lock text-burgundy" style={{ fontSize: '2.5rem' }}></i>
            <h5 className="serif mt-3 mb-2">Inicia sesión para ver tu programa</h5>
            <p className="text-muted mb-3" style={{ maxWidth: '360px', margin: '0 auto 20px', fontSize: '0.95rem' }}>
              Accede a tu cuenta para consultar tu estado de inscripción y las millas acumuladas.
            </p>
            <button className="btn btn-burgundy" onClick={onOpenAuth}>
              <i className="bi bi-person-circle me-2"></i>Iniciar sesión
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="d-flex align-items-center gap-3">
      <div
        style={{
          width: 34, height: 34, flexShrink: 0,
          background: 'var(--burgundy-soft)',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <i className={`bi bi-${icon} text-burgundy`} style={{ fontSize: '0.9rem' }}></i>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', fontWeight: 600 }}>
          {label}
        </div>
        <div style={{ fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </div>
      </div>
    </div>
  );
}
