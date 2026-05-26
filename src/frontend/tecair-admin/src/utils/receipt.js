const MESES_LONG = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

function fmtDateLong(d) {
  if (!d) return '—';
  return `${d.getDate()} de ${MESES_LONG[d.getMonth()]} de ${d.getFullYear()}`;
}

function fmtCRC(n) {
  if (n == null || isNaN(Number(n))) return '—';
  return '&#x20A1;' + Number(n).toLocaleString('es-CR');
}

// Convierte los props del ConfirmStep admin al shape normalizado de receipt.
export function buildReceiptDataFromAdminProps({ reservations, selectedFlight, from, to, paxList, clientEmail, depart }) {
  const paxCount    = paxList.length;
  const pricePerPax = selectedFlight?.price ?? 0;

  const passengers = paxList.map((p, i) => ({
    name:             `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
    passport:         p.passport ?? '—',
    reservationId:    reservations[i]?.reservationId ?? null,
    paymentReference: reservations[i]?.paymentReference ?? '—',
  }));

  const primaryId = reservations[0]?.reservationId;

  // depart viene como string YYYY-MM-DD desde el DatePicker.
  // Se fuerza mediodía para evitar desfases de zona horaria.
  const departDate = depart ? new Date(depart + 'T12:00:00') : null;

  return {
    confirmId:       primaryId ? `AT-${String(primaryId).padStart(6, '0')}` : '—',
    bookingEmail:    clientEmail ?? '—',
    fromCode:        from?.code ?? '—',
    fromCity:        from?.city ?? '',
    toCode:          to?.code   ?? '—',
    toCity:          to?.city   ?? '',
    flightDate:      fmtDateLong(departDate),
    depart:          selectedFlight?.depart   ?? '—',
    arrive:          selectedFlight?.arrive   ?? '—',
    duration:        selectedFlight?.duration ?? '—',
    flightId:        selectedFlight?.itineraryId ?? '—',
    stops:           selectedFlight?.stops    ?? 0,
    paxCount,
    pricePerPax,
    passengers,
    activePromotion: selectedFlight?.activePromotion ?? null,
  };
}

// Genera el HTML del comprobante y abre el diálogo de impresión (Save as PDF).
export function printReceipt(data) {
  const {
    confirmId, bookingEmail,
    fromCode, fromCity, toCode, toCity,
    flightDate, depart, arrive, duration, flightId, stops,
    paxCount, pricePerPax, passengers, activePromotion,
  } = data;

  const subtotal   = pricePerPax * paxCount;
  const tax        = Math.round(subtotal * 0.13);
  const grandTotal = subtotal + tax;
  const stopsLabel = stops === 0 ? 'Directo' : `${stops} escala${stops > 1 ? 's' : ''}`;
  const issueDate  = fmtDateLong(new Date());

  const promoBar = activePromotion
    ? `<div class="promo-bar">
         <span>&#9733; PROMOCIÓN APLICADA</span>
         <span class="mono">${activePromotion.promotionCode}</span>
         <span>${activePromotion.discountPercent}% de descuento</span>
       </div>`
    : '';

  const passengerRows = passengers.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td class="mono">${p.passport}</td>
      <td class="mono">#${p.reservationId ?? '—'}</td>
      <td class="mono">${p.paymentReference}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${confirmId} — TECAir</title>
  <style>
    @page {
      size: letter;
      margin: 14mm 18mm;
    }
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

    /* ─── Header ─── */
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

    /* ─── Dividers ─── */
    .rule-thick {
      height: 3px;
      background: linear-gradient(90deg, #5b1936, #3d0f24 65%, #b08090);
      border-radius: 2px;
      margin-bottom: 16px;
    }
    .rule-thin { height: 1px; background: #e7d5dd; margin: 12px 0; }

    /* ─── Meta pills ─── */
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

    /* ─── Flight card ─── */
    .flight-card {
      background: linear-gradient(135deg, #5b1936 0%, #3d0f24 100%);
      color: #fff;
      border-radius: 12px;
      padding: 18px 22px;
      margin-bottom: 6px;
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
    .fc-city { font-size: 10px; opacity: 0.65; margin-top: 3px; }
    .fc-middle {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
    }
    .fc-plane-line {
      width: 100%;
      display: flex;
      align-items: center;
    }
    .fc-dot { width: 5px; height: 5px; background: rgba(255,255,255,0.45); border-radius: 50%; flex-shrink: 0; }
    .fc-bar { flex: 1; height: 1px; background: rgba(255,255,255,0.3); }
    .fc-icon { font-size: 13px; opacity: 0.85; padding: 0 5px; }
    .fc-stops { font-size: 10px; opacity: 0.7; }
    .fc-sep { width: 1px; height: 52px; background: rgba(255,255,255,0.22); margin: 0 20px; }
    .fc-details { display: flex; flex-direction: column; gap: 9px; }
    .fc-det-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.6; margin-bottom: 1px; }
    .fc-det-value { font-weight: 600; font-size: 12px; }

    /* ─── Promo bar ─── */
    .promo-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #fff8e7;
      border: 1px solid #f0d870;
      color: #7a5800;
      border-radius: 8px;
      padding: 7px 14px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 14px;
    }

    /* ─── Section title ─── */
    .section-title {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #5b1936;
      margin-bottom: 8px;
    }

    /* ─── Table ─── */
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
    thead th:first-child { border-radius: 6px 0 0 6px; }
    thead th:last-child  { border-radius: 0 6px 6px 0; }
    tbody td { padding: 8px 10px; border-bottom: 1px solid #f2eaed; }
    tbody tr:last-child td { border-bottom: none; }

    /* ─── Price box ─── */
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

    /* ─── Footer ─── */
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
      <div class="brand-sub">Aerolínea Tecnológica de Costa Rica</div>
    </div>
    <div class="doc-info">
      <div class="doc-label">Comprobante de pago</div>
      <div class="doc-num serif">${confirmId}</div>
    </div>
  </div>

  <div class="rule-thick"></div>

  <div class="meta-row">
    <div class="pill">
      <div class="pill-label">Fecha de emisión</div>
      <div class="pill-value">${issueDate}</div>
    </div>
    <div class="pill">
      <div class="pill-label">Correo del cliente</div>
      <div class="pill-value">${bookingEmail}</div>
    </div>
    <div class="pill">
      <div class="pill-label">Pasajeros</div>
      <div class="pill-value">${paxCount} ${paxCount === 1 ? 'persona' : 'personas'}</div>
    </div>
    <div class="pill status">
      <div class="pill-label">Estado</div>
      <div class="pill-value">&#10003; Pagado</div>
    </div>
  </div>

  ${promoBar}

  <div class="flight-card">
    <div class="fc-route">
      <div class="fc-airport">
        <div class="fc-iata serif">${fromCode}</div>
        <div class="fc-city">${fromCity}</div>
      </div>
      <div class="fc-middle">
        <div class="fc-plane-line">
          <div class="fc-dot"></div>
          <div class="fc-bar"></div>
          <div class="fc-icon">&#9992;</div>
          <div class="fc-bar"></div>
          <div class="fc-dot"></div>
        </div>
        <div class="fc-stops">${duration} &middot; ${stopsLabel}</div>
      </div>
      <div class="fc-airport">
        <div class="fc-iata serif">${toCode}</div>
        <div class="fc-city">${toCity}</div>
      </div>
    </div>
    <div class="fc-sep"></div>
    <div class="fc-details">
      <div>
        <div class="fc-det-label">Fecha</div>
        <div class="fc-det-value">${flightDate}</div>
      </div>
      <div>
        <div class="fc-det-label">Horario</div>
        <div class="fc-det-value">${depart} &rarr; ${arrive}</div>
      </div>
      <div>
        <div class="fc-det-label">Vuelo</div>
        <div class="fc-det-value mono">${flightId}</div>
      </div>
    </div>
  </div>

  <div class="rule-thin"></div>

  <div class="section-title">Pasajeros y referencias de pago</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Nombre completo</th>
        <th>Pasaporte / ID</th>
        <th>Reserva</th>
        <th>Referencia de pago</th>
      </tr>
    </thead>
    <tbody>${passengerRows}</tbody>
  </table>

  <div class="price-wrap">
    <div class="price-box">
      <div class="price-box-head">Desglose de pago</div>
      <div class="price-box-body">
        <div class="price-row">
          <span>Tarifa base (${paxCount} pax)</span>
          <span>${fmtCRC(subtotal)}</span>
        </div>
        <div class="price-row">
          <span>IVA 13%</span>
          <span>${fmtCRC(tax)}</span>
        </div>
        <div class="price-row grand">
          <span>Total pagado</span>
          <span>${fmtCRC(grandTotal)}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <strong>TECAir</strong> &mdash; Aerolínea Tecnológica de Costa Rica<br>
    Comprobante válido como constancia de pago electrónico. Asientos asignados en check-in.<br>
    Preséntate 2 horas antes &middot; soporte@tecair.cr
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
