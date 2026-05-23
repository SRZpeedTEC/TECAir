const MESES_LONG = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

const pad2 = (n) => String(n).padStart(2, '0');

function fmtDateLong(d) {
  if (!d) return '&mdash;';
  return `${d.getDate()} de ${MESES_LONG[d.getMonth()]} de ${d.getFullYear()}`;
}

function fmtDateTime(value) {
  if (!value) return '&mdash;';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '&mdash;';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fmtWeight(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '&mdash;';
  return `${n.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kg`;
}

function fmtUSD(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '&mdash;';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtList(values) {
  if (!Array.isArray(values) || values.length === 0) return '&mdash;';
  return values.map(escapeHtml).join(', ');
}

// Genera el HTML del reporte de cierre y abre el dialogo de impresion (Save as PDF).
export function printFlightClosingReport(report, targetWindow = null) {
  const flight = report.flight ?? {};
  const summary = report.summary ?? {};
  const itineraries = report.itineraries ?? [];
  const passengers = report.passengers ?? [];
  const reportCode = `FR-${String(flight.flightId ?? '').padStart(6, '0')}`;
  const issueDate = fmtDateLong(new Date());

  const itineraryRows = itineraries.map((it) => `
    <tr>
      <td class="mono">#${escapeHtml(it.itineraryId)}</td>
      <td class="mono">${escapeHtml(it.flightOrder)}</td>
    </tr>`).join('');

  const passengerRows = passengers.map((p) => `
    <tr>
      <td>${escapeHtml(p.passengerFullName)}</td>
      <td class="mono">${escapeHtml(p.passengerPassportId)}</td>
      <td class="mono">#${escapeHtml(p.reservationId)}</td>
      <td class="mono">#${escapeHtml(p.confirmationNumber ?? 'N/A')}</td>
      <td class="mono">${escapeHtml(p.seatNumber ?? 'N/A')}</td>
      <td class="mono">${escapeHtml(p.checkInPlanePlate ?? 'N/A')}</td>
      <td class="text-right">${escapeHtml(p.baggageCount)}</td>
      <td class="text-right">${fmtWeight(p.totalBaggageWeight)}</td>
      <td>${fmtList(p.bagNumbers)}</td>
      <td>${fmtList(p.baggageColors)}</td>
      <td class="text-right">${fmtUSD(p.extraBaggageCharge)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte ${reportCode} &mdash; TECAir</title>
  <style>
    @page { size: letter landscape; margin: 11mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, Arial, sans-serif;
      font-size: 10.5px;
      color: #1a1320;
      background: #fff;
      line-height: 1.45;
    }
    .serif { font-family: Georgia, 'Times New Roman', serif; }
    .mono  { font-family: 'Courier New', Courier, monospace; font-size: 10px; }
    .text-right { text-align: right; }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .brand-name {
      font-family: Georgia, serif;
      font-size: 34px;
      font-weight: 700;
      color: #5b1936;
      letter-spacing: -1.3px;
      line-height: 1;
    }
    .brand-sub {
      font-size: 9px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1.8px;
      margin-top: 5px;
    }
    .doc-info { text-align: right; }
    .doc-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1.4px;
      color: #999;
      margin-bottom: 3px;
    }
    .doc-num {
      font-family: Georgia, serif;
      font-size: 22px;
      color: #3d0f24;
      font-weight: 700;
    }
    .rule-thick {
      height: 3px;
      background: linear-gradient(90deg, #5b1936, #3d0f24 65%, #b08090);
      border-radius: 2px;
      margin-bottom: 13px;
    }
    .meta-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 13px; }
    .pill {
      flex: 1;
      min-width: 120px;
      background: #f7eef2;
      border-radius: 8px;
      padding: 8px 11px;
    }
    .pill-label {
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.9px;
      color: #9b6070;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .pill-value { font-weight: 700; color: #1a1320; font-size: 11px; }

    .flight-card {
      background: linear-gradient(135deg, #5b1936 0%, #3d0f24 100%);
      color: #fff;
      border-radius: 10px;
      padding: 13px 17px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
    }
    .fc-route { flex: 1; display: flex; align-items: center; gap: 10px; }
    .fc-airport { text-align: center; min-width: 70px; }
    .fc-iata {
      font-family: Georgia, serif;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 2px;
      line-height: 1;
    }
    .fc-city { font-size: 9px; opacity: 0.7; margin-top: 3px; }
    .fc-middle { flex: 1; text-align: center; font-size: 10px; opacity: 0.78; }
    .fc-sep { width: 1px; height: 48px; background: rgba(255,255,255,0.22); margin: 0 16px; }
    .fc-details { display: grid; grid-template-columns: repeat(2, minmax(95px, 1fr)); gap: 6px 16px; }
    .fc-det-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.62; margin-bottom: 1px; }
    .fc-det-value { font-weight: 700; font-size: 10.5px; }

    .section-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.3px;
      color: #5b1936;
      margin: 12px 0 7px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 11px; }
    thead th {
      background: #f7eef2;
      color: #5b1936;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      padding: 6px 7px;
      font-weight: 700;
      text-align: left;
    }
    tbody td { padding: 6px 7px; border-bottom: 1px solid #f2eaed; vertical-align: top; }
    tbody tr:last-child td { border-bottom: none; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 7px;
      margin-bottom: 10px;
    }
    .summary-box {
      border: 1px solid #e7d5dd;
      border-radius: 8px;
      padding: 8px 9px;
      background: #fbf6f8;
    }
    .summary-value {
      font-family: Georgia, serif;
      font-size: 18px;
      font-weight: 700;
      color: #3d0f24;
      line-height: 1;
    }
    .summary-label {
      font-size: 8px;
      color: #8a6a76;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      margin-top: 4px;
    }
    .footer {
      border-top: 1px solid #e7d5dd;
      padding-top: 9px;
      color: #aaa;
      font-size: 8.5px;
      text-align: center;
    }
    .footer strong { color: #5b1936; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-name serif">TECAir</div>
      <div class="brand-sub">Reporte operativo de cierre de vuelo</div>
    </div>
    <div class="doc-info">
      <div class="doc-label">Reporte de cierre</div>
      <div class="doc-num serif">${reportCode}</div>
    </div>
  </div>

  <div class="rule-thick"></div>

  <div class="meta-row">
    <div class="pill">
      <div class="pill-label">Fecha de emision</div>
      <div class="pill-value">${issueDate}</div>
    </div>
    <div class="pill">
      <div class="pill-label">Vuelo</div>
      <div class="pill-value mono">#${escapeHtml(flight.flightId)}</div>
    </div>
    <div class="pill">
      <div class="pill-label">Estado</div>
      <div class="pill-value">${escapeHtml(flight.state)}</div>
    </div>
    <div class="pill">
      <div class="pill-label">Avion</div>
      <div class="pill-value mono">${escapeHtml(flight.planePlate)}</div>
    </div>
    <div class="pill">
      <div class="pill-label">Gate</div>
      <div class="pill-value mono">${escapeHtml(flight.gate ?? 'N/A')}</div>
    </div>
  </div>

  <div class="flight-card">
    <div class="fc-route">
      <div class="fc-airport">
        <div class="fc-iata serif">${escapeHtml(flight.departureAirportCode)}</div>
        <div class="fc-city">${escapeHtml(flight.departureAirportCity)}</div>
      </div>
      <div class="fc-middle">&#9992;<br>${escapeHtml(flight.departureAirportName)} &rarr; ${escapeHtml(flight.arrivalAirportName)}</div>
      <div class="fc-airport">
        <div class="fc-iata serif">${escapeHtml(flight.arrivalAirportCode)}</div>
        <div class="fc-city">${escapeHtml(flight.arrivalAirportCity)}</div>
      </div>
    </div>
    <div class="fc-sep"></div>
    <div class="fc-details">
      <div>
        <div class="fc-det-label">Salida</div>
        <div class="fc-det-value mono">${fmtDateTime(flight.departureDatetime)}</div>
      </div>
      <div>
        <div class="fc-det-label">Llegada</div>
        <div class="fc-det-value mono">${fmtDateTime(flight.arrivalDatetime)}</div>
      </div>
      <div>
        <div class="fc-det-label">Plane plate</div>
        <div class="fc-det-value mono">${escapeHtml(flight.planePlate)}</div>
      </div>
      <div>
        <div class="fc-det-label">Flight ID</div>
        <div class="fc-det-value mono">#${escapeHtml(flight.flightId)}</div>
      </div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-box"><div class="summary-value">${escapeHtml(summary.totalPassengers)}</div><div class="summary-label">Pasajeros</div></div>
    <div class="summary-box"><div class="summary-value">${escapeHtml(summary.totalReservations)}</div><div class="summary-label">Reservas</div></div>
    <div class="summary-box"><div class="summary-value">${escapeHtml(summary.totalCheckedInPassengers)}</div><div class="summary-label">Check-in</div></div>
    <div class="summary-box"><div class="summary-value">${escapeHtml(summary.totalBaggageCount)}</div><div class="summary-label">Maletas</div></div>
    <div class="summary-box"><div class="summary-value">${fmtWeight(summary.totalBaggageWeight)}</div><div class="summary-label">Peso</div></div>
    <div class="summary-box"><div class="summary-value">${fmtUSD(summary.totalExtraBaggageCharges)}</div><div class="summary-label">Cargos extra</div></div>
  </div>

  <div class="section-title">Itinerarios que contienen este vuelo</div>
  <table>
    <thead><tr><th>Itinerary ID</th><th>Orden dentro del itinerario</th></tr></thead>
    <tbody>${itineraryRows || '<tr><td colspan="2" class="mono">Sin itinerarios asociados.</td></tr>'}</tbody>
  </table>

  <div class="section-title">Pasajeros, reservaciones, check-ins y equipaje</div>
  <table>
    <thead>
      <tr>
        <th>Pasajero</th>
        <th>Pasaporte</th>
        <th>Reserva</th>
        <th>Confirmacion</th>
        <th>Asiento</th>
        <th>Avion check-in</th>
        <th class="text-right">Maletas</th>
        <th class="text-right">Peso</th>
        <th>Numeros</th>
        <th>Colores</th>
        <th class="text-right">Extra</th>
      </tr>
    </thead>
    <tbody>${passengerRows || '<tr><td colspan="11" class="mono">Sin reservaciones para este vuelo.</td></tr>'}</tbody>
  </table>

  <div class="footer">
    <strong>TECAir</strong> &mdash; Reporte generado desde la vista administrativa de cierre de vuelos.
  </div>
</body>
</html>`;

  const win = targetWindow ?? window.open('', '_blank', 'width=1180,height=820');
  if (!win) {
    alert('El navegador bloqueo la ventana emergente. Permite pop-ups para este sitio y vuelve a intentarlo.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 700);
}
