import { useState } from 'react';
import Nav        from '../../components/Nav.js';
import Stepper    from '../../components/Stepper.js';
import SummarySide from '../../components/SummarySide.js';

// Pantalla de datos de pasajeros: formulario con validación para cada viajero
export default function PaxPage({ state, setState, goBack, goToConfirm, goToMisViajes, currentUser, onOpenAuth, onLogout, onStudentProgram }) {
  const total = state.pax.adults;

  // Inicializa la lista con los datos ya ingresados o con campos vacíos
  const [paxList, setPaxList] = useState(
    Array.from({ length: total }, (_, i) => state.passengers[i] || {
      firstName: '', lastName: '', passport: '', dob: '', gender: '',
    })
  );
  const [errs, setErrs] = useState({});

  // Actualiza un campo específico de un pasajero
  const update = (i, key, val) => {
    const next = [...paxList];
    next[i] = { ...next[i], [key]: val };
    setPaxList(next);
  };

  // Valida todos los campos requeridos antes de continuar
  const submit = () => {
    const e = {};
    paxList.forEach((p, i) => {
      if (!p.firstName)                  e[i + 'firstName'] = true;
      if (!p.lastName)                   e[i + 'lastName']  = true;
      if (!p.passport || p.passport.length < 6) e[i + 'passport'] = true;
      if (!p.dob)                        e[i + 'dob']       = true;
      if (!p.gender)                     e[i + 'gender']    = true;
    });
    setErrs(e);
    if (Object.keys(e).length === 0) {
      setState((s) => ({ ...s, passengers: paxList }));
      goToConfirm();
    }
  };

  return (
    <>
      <Nav onLogoClick={goBack} onOpenAuth={onOpenAuth} onLogout={onLogout} onStudentProgram={onStudentProgram} onMisViajes={goToMisViajes} currentUser={currentUser} />

      {/* Barra de progreso de la reserva */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--line)' }}>
        <div className="container py-3">
          <Stepper active={1} />
        </div>
      </div>

      <div className="container py-4">
        <div className="row">
          <div className="col-lg-8">
            <h2 className="serif mb-1" style={{ fontSize: '2rem' }}>Información de pasajeros</h2>
            <p className="text-muted">
              Ingresa los datos exactamente como aparecen en el pasaporte de cada viajero.
            </p>

            {/* Formulario individual por pasajero */}
            {paxList.map((p, i) => (
              <div className="bg-white border rounded-3 p-4 mb-3" key={i} style={{ borderColor: 'var(--line)' }}>
                {/* Encabezado con número de pasajero */}
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span
                    className="d-inline-flex align-items-center justify-content-center"
                    style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--burgundy)', color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    {i + 1}
                  </span>
                  <h5 className="mb-0 serif">Pasajero {i + 1}</h5>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small text-muted">Nombre(s)</label>
                    <input
                      className={'form-control ' + (errs[i + 'firstName'] ? 'is-invalid' : '')}
                      value={p.firstName}
                      onChange={(e) => update(i, 'firstName', e.target.value)}
                      placeholder="María José"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small text-muted">Apellidos</label>
                    <input
                      className={'form-control ' + (errs[i + 'lastName'] ? 'is-invalid' : '')}
                      value={p.lastName}
                      onChange={(e) => update(i, 'lastName', e.target.value)}
                      placeholder="Rodríguez Méndez"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small text-muted">Número de pasaporte</label>
                    <input
                      className={'form-control ' + (errs[i + 'passport'] ? 'is-invalid' : '')}
                      value={p.passport}
                      onChange={(e) => update(i, 'passport', e.target.value.toUpperCase())}
                      placeholder="A12345678"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small text-muted">Fecha de nacimiento</label>
                    <input
                      type="date"
                      className={'form-control ' + (errs[i + 'dob'] ? 'is-invalid' : '')}
                      value={p.dob}
                      onChange={(e) => update(i, 'dob', e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small text-muted">Género</label>
                    <select
                      className={'form-select ' + (errs[i + 'gender'] ? 'is-invalid' : '')}
                      value={p.gender}
                      onChange={(e) => update(i, 'gender', e.target.value)}
                    >
                      <option value="">Selecciona...</option>
                      <option>Femenino</option>
                      <option>Masculino</option>
                      <option>Otro</option>
                      <option>Prefiero no decir</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}

            {/* Botones de navegación */}
            <div className="d-flex justify-content-between mt-4">
              <button className="btn btn-burgundy-outline" onClick={goBack}>
                <i className="bi bi-arrow-left me-2"></i>Volver a vuelos
              </button>
              <button className="btn btn-burgundy" onClick={submit}>
                Confirmar reservación <i className="bi bi-arrow-right ms-2"></i>
              </button>
            </div>
          </div>

          {/* Panel lateral con resumen del viaje */}
          <div className="col-lg-4">
            <SummarySide state={state} />
          </div>
        </div>
      </div>
    </>
  );
}
