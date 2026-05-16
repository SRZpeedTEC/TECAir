import { useState, useEffect } from 'react';
import Nav from '../../components/Nav.js';
import Stepper from '../../components/Stepper.js';
import SummarySide from '../../components/SummarySide.js';
import { createPassenger, mapGenderToCode }        from '../../services/passengerService.js';
import { createReservation, generatePaymentReference } from '../../services/reservationService.js';

// Pantalla de datos de pasajeros: formulario con validación para cada viajero
export default function PaxPage({ state, setState, goBack, goToConfirm, goToMisViajes, currentUser, onOpenAuth, onLogout, onStudentProgram }) {
  const total = state.pax.adults;

  // Inicializa la lista con los datos ya ingresados o con campos vacíos
  const [paxList, setPaxList] = useState(
    Array.from({ length: total }, (_, i) => state.passengers[i] || {
      firstName: '', lastName: '', passport: '', dob: '', gender: '',
    })
  );
  const [errs,       setErrs]       = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  // Cuando el usuario apreta "Confirmar" sin sesion, validamos el form y
  // abrimos el modal. Este flag dispara el submit real apenas haya sesion.
  const [awaitingLogin, setAwaitingLogin] = useState(false);

  // Actualiza un campo específico de un pasajero
  const update = (i, key, val) => {
    const next = [...paxList];
    next[i] = { ...next[i], [key]: val };
    setPaxList(next);
  };

  // Valida campos sin enviar nada al backend. Se reutiliza tanto en el flujo
  // normal como cuando hay que abrir el modal de login antes de reservar.
  const validate = () => {
    const e = {};
    paxList.forEach((p, i) => {
      if (!p.firstName)                  e[i + 'firstName'] = true;
      if (!p.lastName)                   e[i + 'lastName']  = true;
      if (!p.passport || p.passport.length < 6) e[i + 'passport'] = true;
      if (!p.dob)                        e[i + 'dob']       = true;
      if (!p.gender)                     e[i + 'gender']    = true;
    });
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  // Crea pasajeros + reservaciones (una por cada pasajero) contra el backend
  // usando el email del usuario en sesión.
  const performReservation = async (userEmail) => {
    const itineraryId = state.selectedFlight?.itineraryId;
    if (!itineraryId) {
      setApiError('No hay un itinerario seleccionado. Volve a elegir un vuelo.');
      return;
    }

    setSubmitting(true);
    setApiError(null);

    try {
      const reservations = [];

      for (let i = 0; i < paxList.length; i++) {
        const p = paxList[i];
        const passportId = p.passport.trim().toUpperCase();

        // 1. Asegura que el passenger exista. 409 = ya existia, lo reusamos.
        try {
          await createPassenger({
            passportId,
            birthday: p.dob,
            gender:   mapGenderToCode(p.gender),
            name:     p.firstName.trim(),
            lname:    p.lastName.trim(),
          });
        } catch (err) {
          if (!/409|already exists|exists with that passport|conflict/i.test(err.message)) {
            throw err;
          }
        }

        // 2. Crea la reservacion pagada para este pasajero.
        const reservation = await createReservation({
          itineraryId,
          userEmail,
          passengerId:      passportId,
          state:            'PAID',
          paymentReference: generatePaymentReference(i),
        });

        reservations.push(reservation);
      }

      setState((s) => ({
        ...s,
        passengers:   paxList,
        reservations,
        bookingEmail: userEmail,
      }));
      goToConfirm();
    } catch (err) {
      setApiError(err.message || 'No se pudo crear la reservación.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler del botón "Confirmar reservación".
  // Si no hay sesión activa, validamos primero y abrimos el modal de login;
  // cuando vuelva con currentUser, el useEffect dispara performReservation.
  const submit = () => {
    if (!validate()) return;
    if (!currentUser?.email) {
      setApiError(null);
      setAwaitingLogin(true);
      onOpenAuth();
      return;
    }
    performReservation(currentUser.email);
  };

  // Dispara la reserva pendiente apenas el usuario inicia sesión.
  useEffect(() => {
    if (awaitingLogin && currentUser?.email && !submitting) {
      setAwaitingLogin(false);
      performReservation(currentUser.email);
    }
  }, [awaitingLogin, currentUser, submitting]);

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

            {awaitingLogin && !currentUser && (
              <div className="alert mt-3 d-flex align-items-center justify-content-between gap-2" style={{ background: 'var(--burgundy-soft)', color: 'var(--burgundy)', border: '1px solid var(--burgundy-line)', borderRadius: 12 }}>
                <span>
                  <i className="bi bi-person-lock me-2"></i>
                  Para confirmar tu reservación necesitas una cuenta. Inicia sesión o créala.
                </span>
                <button type="button" className="btn btn-burgundy btn-sm" onClick={onOpenAuth}>
                  Iniciar sesión
                </button>
              </div>
            )}

            {apiError && (
              <div className="alert mt-3" style={{ background: '#fde8ee', color: '#9b2335', border: 'none', borderRadius: 12 }}>
                <i className="bi bi-exclamation-triangle me-2"></i>
                {apiError}
              </div>
            )}

            {/* Botones de navegación */}
            <div className="d-flex justify-content-between mt-4">
              <button className="btn btn-burgundy-outline" onClick={goBack} disabled={submitting}>
                <i className="bi bi-arrow-left me-2"></i>Volver a vuelos
              </button>
              <button className="btn btn-burgundy" onClick={submit} disabled={submitting}>
                {submitting
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>Creando reservación…</>
                  : <>Confirmar reservación <i className="bi bi-arrow-right ms-2"></i></>}
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
