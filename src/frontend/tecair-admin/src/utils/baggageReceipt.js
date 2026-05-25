import { feeForBagAt, totalFee } from '../services/baggageService.js';

const MESES_LONG = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

const pad2 = (n) => String(n).padStart(2, '0');

function fmtDateLong(d) {
  if (!d) return '—';
  return `${d.getDate()} de ${MESES_LONG[d.getMonth()]} de ${d.getFullYear()}`;
}

function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fmtUSD(n) {
  if (n == null || isNaN(Number(n))) return '—';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// Genera el HTML del comprobante de cobro de equipaje y abre el diálogo de impresión.
// Datos esperados:
//   reservation { reservationId, passengerName, passengerId, itineraryId }
//   checkIn     { confirmationNumber, seatNumber }
//   flightInfo  { flightOrder, departureCode, arrivalCode, departureDatetime, arrivalDatetime, flightId }
//   bags        [{ bagNumber, weight, color }]
export function printBaggageReceipt({ reservation, checkIn, flightInfo, bags }) {
  const issueDate = fmtDateLong(new Date());

  const bagCount   = bags.length;
  const subtotal   = totalFee(bagCount);
  const tax        = Math.round(subtotal * 0.13 * 100) / 100;
  const grandTotal = Math.round((subtotal + tax) * 100) / 100;

  const baggageRows = bags.map((b, i) => {
    const fee = feeForBagAt(i + 1);
    const feeText = fee === 0 ? '<span class="free-pill">Gratis</span>' : fmtUSD(fee);
    return `
    <tr>
      <td class="mono">${i + 1}</td>
      <td class="mono">#${escapeHtml(b.bagNumber)}</td>
      <td class="mono">${Number(b.weight).toFixed(1)} kg</td>
      <td>${escapeHtml(b.color)}</td>
      <td class="text-right">${feeText}</td>
    </tr>`;
  }).join('');

  const confirmCode = `BG-${String(checkIn.confirmationNumber).padStart(6, '0')}`;

  const flightLine = flightInfo
    ? `${escapeHtml(flightInfo.departureCode)} &rarr; ${escapeHtml(flightInfo.arrivalCode)}`
    : '—';
  const flightSchedule = flightInfo
    ? `${fmtDateTime(flightInfo.departureDatetime)}`
    : '—';
  const flightOrderText = flightInfo?.flightOrder
    ? `Tramo ${escapeHtml(flightInfo.flightOrder)}`
    : '—';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${confirmCode} — TECAir Equipaje</title>
  <style>
    @page { size: letter; margin: 14mm 18mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, Arial, sans-serif;
      font-size: 12.5px;
      color: #1a1320;
      background: #fff;
      line-height: 1.5;
    }
    .serif { font-family: Georgia, 'Times New Roman', serif; }
    .mono  { font-family: 'Courier New', Courier, monospace; font-size: 11px; }
    .text-right { text-align: right; }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .brand-name {
      font-family: Georgia, serif;
      font-size: 38px;
      font-weight: 700;
      color: #5b1936;
      letter-spacing: -1.5px;
      line-height: 1;
    }
    .brand-sub {
      font-size: 9.5px;
      color: #aaa;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 5px;
    }
    .doc-info { text-align: right; }
    .doc-label {
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #999;
      margin-bottom: 3px;
    }
    .doc-num {
      font-family: Georgia, serif;
      font-size: 24px;
      color: #3d0f24;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .rule-thick {
      height: 3px;
      background: linear-gradient(90deg, #5b1936, #3d0f24 65%, #b08090);
      border-radius: 2px;
      margin-bottom: 16px;
    }
    .rule-thin { height: 1px; background: #e7d5dd; margin: 12px 0; }

    .meta-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
    .pill {
      flex: 1;
      min-width: 115px;
      background: #f7eef2;
      border-radius: 8px;
      padding: 9px 13px;
    }
    .pill-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9b6070;
      font-weight: 700;
      margin-bottom: 3px;
    }
    .pill-value { font-weight: 600; color: #1a1320; font-size: 12px; }
    .pill.status .pill-value { color: #1c7a45; }

    .pax-card {
      background: #fbf6f8;
      border: 1px solid #e7d5dd;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 14px;
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }
    .pax-block { min-width: 130px; }
    .pax-block .pill-label { margin-bottom: 2px; }
    .pax-name { font-size: 15px; font-weight: 700; color: #3d0f24; }

    .flight-card {
      background: linear-gradient(135deg, #5b1936 0%, #3d0f24 100%);
      color: #fff;
      border-radius: 12px;
      padding: 18px 22px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
    }
    .fc-route { flex: 1; display: flex; align-items: center; gap: 12px; }
    .fc-airport { text-align: center; }
    .fc-iata {
      font-family: Georgia, serif;
      font-size: 30px;
      font-weight: 700;
      letter-spacing: 2px;
      line-height: 1;
    }
    .fc-middle {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
    }
    .fc-plane-line { width: 100%; display: flex; align-items: center; }
    .fc-dot { width: 5px; height: 5px; background: rgba(255,255,255,0.45); border-radius: 50%; flex-shrink: 0; }
    .fc-bar { flex: 1; height: 1px; background: rgba(255,255,255,0.3); }
    .fc-icon { font-size: 13px; opacity: 0.85; padding: 0 5px; }
    .fc-stops { font-size: 10px; opacity: 0.7; }
    .fc-sep { width: 1px; height: 52px; background: rgba(255,255,255,0.22); margin: 0 20px; }
    .fc-details { display: flex; flex-direction: column; gap: 9px; }
    .fc-det-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.6; margin-bottom: 1px; }
    .fc-det-value { font-weight: 600; font-size: 12px; }

    .section-title {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #5b1936;
      margin-bottom: 8px;
    }

    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11.5px; }
    thead th {
      background: #f7eef2;
      color: #5b1936;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 7px 10px;
      font-weight: 700;
      text-align: left;
    }
    thead th:last-child { text-align: right; }
    thead th:first-child { border-radius: 6px 0 0 6px; }
    thead th:last-child  { border-radius: 0 6px 6px 0; }
    tbody td { padding: 8px 10px; border-bottom: 1px solid #f2eaed; }
    tbody tr:last-child td { border-bottom: none; }
    .free-pill {
      display: inline-block;
      background: #e8f5ee;
      color: #1c7a45;
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 10.5px;
    }

    .rules-note {
      font-size: 10px;
      color: #8a6a76;
      margin-bottom: 14px;
      padding: 6px 10px;
      background: #fbf6f8;
      border-left: 3px solid #b08090;
      border-radius: 4px;
    }

    .price-wrap { display: flex; justify-content: flex-end; margin-bottom: 18px; }
    .price-box { width: 268px; border: 1px solid #e7d5dd; border-radius: 10px; overflow: hidden; }
    .price-box-head {
      background: #5b1936;
      color: #fff;
      padding: 8px 14px;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      font-weight: 700;
    }
    .price-box-body { padding: 12px 14px; }
    .price-row { display: flex; justify-content: space-between; padding: 3px 0; color: #555; font-size: 12px; }
    .price-row.grand {
      border-top: 1px solid #e7d5dd;
      margin-top: 8px;
      padding-top: 10px;
      font-size: 15px;
      font-weight: 700;
      color: #3d0f24;
    }

    .footer {
      border-top: 1px solid #e7d5dd;
      padding-top: 12px;
      color: #bbb;
      font-size: 9.5px;
      text-align: center;
      line-height: 1.7;
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
      <div class="brand-sub">Comprobante de cobro de equipaje</div>
    </div>
    <div class="doc-info">
      <div class="doc-label">Factura de equipaje</div>
      <div class="doc-num serif">${confirmCode}</div>
    </div>
  </div>

  <div class="rule-thick"></div>

  <div class="meta-row">
    <div class="pill">
      <div class="pill-label">Fecha de emisión</div>
      <div class="pill-value">${issueDate}</div>
    </div>
    <div class="pill">
      <div class="pill-label">Confirmación check-in</div>
      <div class="pill-value mono">#${escapeHtml(checkIn.confirmationNumber)}</div>
    </div>
    <div class="pill">
      <div class="pill-label">Asiento</div>
      <div class="pill-value mono">${escapeHtml(checkIn.seatNumber)}</div>
    </div>
    <div class="pill status">
      <div class="pill-label">Estado</div>
      <div class="pill-value">&#10003; Pagado</div>
    </div>
  </div>

  <div class="section-title">Pasajero</div>
  <div class="pax-card">
    <div class="pax-block">
      <div class="pill-label">Nombre</div>
      <div class="pax-name">${escapeHtml(reservation.passengerName)}</div>
    </div>
    <div class="pax-block">
      <div class="pill-label">Pasaporte / ID</div>
      <div class="pill-value mono">${escapeHtml(reservation.passengerId)}</div>
    </div>
    <div class="pax-block">
      <div class="pill-label">Reserva</div>
      <div class="pill-value mono">#${escapeHtml(reservation.reservationId)}</div>
    </div>
    <div class="pax-block">
      <div class="pill-label">Itinerario</div>
      <div class="pill-value mono">#${escapeHtml(reservation.itineraryId)}</div>
    </div>
  </div>

  <div class="section-title">Vuelo asociado</div>
  <div class="flight-card">
    <div class="fc-route">
      <div class="fc-airport">
        <div class="fc-iata serif">${escapeHtml(flightInfo?.departureCode ?? '—')}</div>
      </div>
      <div class="fc-middle">
        <div class="fc-plane-line">
          <div class="fc-dot"></div>
          <div class="fc-bar"></div>
          <div class="fc-icon">&#9992;</div>
          <div class="fc-bar"></div>
          <div class="fc-dot"></div>
        </div>
        <div class="fc-stops">${flightOrderText}</div>
      </div>
      <div class="fc-airport">
        <div class="fc-iata serif">${escapeHtml(flightInfo?.arrivalCode ?? '—')}</div>
      </div>
    </div>
    <div class="fc-sep"></div>
    <div class="fc-details">
      <div>
        <div class="fc-det-label">Salida</div>
        <div class="fc-det-value mono">${flightSchedule}</div>
      </div>
      <div>
        <div class="fc-det-label">Ruta</div>
        <div class="fc-det-value mono">${flightLine}</div>
      </div>
    </div>
  </div>

  <div class="section-title">Detalle de maletas</div>
  <div class="rules-note">
    Tarifas: 1ra maleta gratis &middot; 2da maleta $50 &middot; 3ra+ maleta $75 c/u.
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>N° de maleta</th>
        <th>Peso</th>
        <th>Color</th>
        <th class="text-right">Tarifa</th>
      </tr>
    </thead>
    <tbody>${baggageRows || `<tr><td colspan="5" class="mono">Sin maletas registradas.</td></tr>`}</tbody>
  </table>

  <div class="price-wrap">
    <div class="price-box">
      <div class="price-box-head">Desglose de cobro</div>
      <div class="price-box-body">
        <div class="price-row">
          <span>Subtotal (${bagCount} maleta${bagCount === 1 ? '' : 's'})</span>
          <span>${fmtUSD(subtotal)}</span>
        </div>
        <div class="price-row">
          <span>IVA 13%</span>
          <span>${fmtUSD(tax)}</span>
        </div>
        <div class="price-row grand">
          <span>Total a pagar</span>
          <span>${fmtUSD(grandTotal)}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <strong>TECAir</strong> &mdash; Aerolínea Tecnológica de Costa Rica<br>
    Comprobante válido como constancia de pago electrónico del equipaje facturado.<br>
    Equipaje sujeto a inspección &middot; soporte@tecair.cr
  </div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=870,height=1150');
  if (!win) {
    alert('El navegador bloqueó la ventana emergente. Permite pop-ups para este sitio y vuelve a intentarlo.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 700);
}
