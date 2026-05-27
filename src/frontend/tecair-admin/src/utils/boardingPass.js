const MESES_LONG = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

const pad2 = (n) => String(n).padStart(2, '0');

function fmtDateLong(d) {
  if (!d || isNaN(d.getTime())) return '—';
  return `${d.getDate()} de ${MESES_LONG[d.getMonth()]} de ${d.getFullYear()}`;
}

function fmtTime(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function calcDuration(a, b) {
  const start = new Date(a);
  const end   = new Date(b);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '—';
  const mins = Math.max(0, Math.round((end - start) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${pad2(m)}m`;
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

// Barras de un "código de barras" decorativo a partir de un número de
// confirmación. Determinístico para que el mismo pase siempre se vea igual.
function barcodeBars(seedNumber) {
  const widths = [1,2,1,3,1,1,2,1,2,3,1,1,2,1,1,3,2,1,1,2,1,3,1,2,1,1,3,1,2,1,1,3,1,1,2,1,2,1];
  const seed = Number(seedNumber) || 0;
  return widths
    .map((w, i) => {
      // Pequeña perturbación determinística según el número de confirmación.
      const ww = ((w + ((seed >> (i % 5)) & 1)) % 3) + 1;
      return `<span style="width:${ww * 2}px;height:46px;background:#1a1320;display:inline-block;margin-right:2px;"></span>`;
    })
    .join('');
}

// Genera el HTML del pase de abordar (con forma de ticket) y abre el diálogo
// de impresión del navegador. Ese diálogo permite tanto "Guardar como PDF"
// como enviar a una impresora física.
//
// Datos esperados:
//   reservation { reservationId, passengerName, passengerId, itineraryId }
//   flight      { flightId, flightOrder, departureCode, departureCity,
//                 arrivalCode, arrivalCity, departureDatetime, arrivalDatetime,
//                 gate, planePlate }
//   checkIn     { confirmationNumber, seatNumber }
export function printBoardingPass({ reservation, flight, checkIn }) {
  const confirmCode = `BP-${String(checkIn.confirmationNumber).padStart(6, '0')}`;
  const departDate  = new Date(flight.departureDatetime);
  const seat        = checkIn.seatNumber ?? '—';
  const gate        = flight.gate ?? '—';
  const flightLabel = `AT${String(flight.flightId).padStart(3, '0')}`;
  const boardingTime = (() => {
    const d = new Date(flight.departureDatetime);
    if (isNaN(d.getTime())) return '—';
    d.setMinutes(d.getMinutes() - 40); // embarque 40 min antes de la salida
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  })();

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Pase de abordar ${confirmCode} — TECAir</title>
  <style>
    /* La página tiene exactamente el tamaño del ticket: sin márgenes ni
       espacio sobrante alrededor del pase. */
    @page { size: 200mm 92mm; margin: 0; }
    html, body { width: 200mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, Arial, sans-serif;
      color: #1a1320;
      background: #ece8ea;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 18px;
    }
    .serif { font-family: Georgia, 'Times New Roman', serif; }
    .mono  { font-family: 'Courier New', Courier, monospace; }

    .ticket {
      display: flex;
      width: 760px;
      background: #fff;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 0 0 1.5px #e2c9d4, 0 10px 30px rgba(91,25,54,0.18);
    }

    /* ─── Sección principal ─── */
    .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .head {
      background: #5b1936;
      padding: 12px 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      color: #fff;
      font-family: Georgia, serif;
      font-weight: 700;
      font-size: 20px;
      letter-spacing: -0.5px;
    }
    .head-tag {
      background: rgba(255,255,255,0.16);
      color: #fff;
      font-size: 10px;
      padding: 3px 11px;
      border-radius: 999px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .route {
      padding: 22px 24px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .ap { min-width: 84px; }
    .ap.right { text-align: right; }
    .iata {
      font-weight: 800;
      font-size: 40px;
      color: #5b1936;
      line-height: 1;
      letter-spacing: -1px;
    }
    .city { font-size: 11px; color: #8a8390; margin-top: 3px; }
    .time { font-weight: 700; font-size: 20px; margin-top: 8px; color: #1a1320; }
    .mid { flex: 1; text-align: center; }
    .mid .dur {
      font-size: 10px; color: #8a8390;
      text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;
    }
    .mid .line { position: relative; height: 2px; background: #e2c9d4; }
    .mid .line .plane {
      position: absolute; left: 50%; top: 50%;
      transform: translate(-50%, -55%);
      background: #fff; padding: 0 7px; color: #5b1936; font-size: 15px;
    }
    .mid .flightno { font-size: 11px; color: #8a8390; margin-top: 6px; font-weight: 600; }

    .meta {
      display: flex; gap: 26px; flex-wrap: wrap;
      padding: 12px 24px;
      margin: 0 24px;
      border-top: 1px dashed #e2c9d4;
    }
    .meta-item .lbl {
      font-size: 8.5px; text-transform: uppercase; letter-spacing: 1px;
      color: #9b6070; font-weight: 700;
    }
    .meta-item .val { font-size: 14px; font-weight: 600; color: #1a1320; margin-top: 2px; }
    .meta-item .val.big { font-size: 20px; color: #5b1936; font-weight: 800; }

    .pax {
      padding: 12px 24px 18px;
      margin: 8px 24px 0;
      border-top: 1px dashed #e2c9d4;
    }
    .pax .lbl {
      font-size: 8.5px; text-transform: uppercase; letter-spacing: 1px;
      color: #9b6070; font-weight: 700; margin-bottom: 4px;
    }
    .pax .name { font-size: 18px; font-weight: 700; color: #1a1320; }
    .pax .doc { font-size: 12px; color: #8a8390; margin-top: 2px; }

    /* ─── Separador con muescas ─── */
    .perf { position: relative; width: 30px; flex-shrink: 0; }
    .perf .notch {
      position: absolute; left: 2px; width: 26px; height: 26px;
      border-radius: 50%; background: #ece8ea; z-index: 4;
    }
    .perf .notch.top { top: -13px; }
    .perf .notch.bot { bottom: -13px; }
    .perf .dash {
      position: absolute; top: 14px; bottom: 14px; left: 50%;
      transform: translateX(-50%); border-left: 2px dashed #e2c9d4;
    }

    /* ─── Stub derecho ─── */
    .stub {
      width: 188px; flex-shrink: 0;
      display: flex; flex-direction: column; align-items: center;
      padding: 18px 16px;
    }
    .stub .blk { text-align: center; width: 100%; margin-bottom: 12px; }
    .stub .blk .lbl {
      font-size: 8.5px; text-transform: uppercase; letter-spacing: 1.2px;
      color: #9b6070; font-weight: 700; margin-bottom: 3px;
    }
    .stub .blk .val { font-weight: 800; font-size: 16px; color: #5b1936; }
    .stub .seatbig {
      font-weight: 800; font-size: 34px; color: #5b1936; line-height: 1;
    }
    .barcode { display: flex; align-items: flex-end; justify-content: center; margin: 6px 0 4px; }
    .stub .code { font-size: 11px; color: #8a8390; letter-spacing: 1px; }

    @media print {
      html, body {
        width: 200mm;
        height: 92mm;
        background: #fff;
        padding: 0;
        margin: 0;
        display: block;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      /* El ticket ocupa toda la página (que ya tiene su tamaño exacto).
         height auto + min-height evita que el contenido se escale o recorte. */
      .ticket {
        width: 200mm;
        height: 92mm;
        border-radius: 0;
        box-shadow: none;
      }
      .perf .notch { background: #fff; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="main">
      <div class="head">
        <span class="brand">TECAir</span>
        <span class="head-tag">Pase de abordar</span>
      </div>

      <div class="route">
        <div class="ap">
          <div class="iata">${escapeHtml(flight.departureCode)}</div>
          <div class="city">${escapeHtml(flight.departureCity ?? '')}</div>
          <div class="time">${fmtTime(flight.departureDatetime)}</div>
        </div>
        <div class="mid">
          <div class="dur">${calcDuration(flight.departureDatetime, flight.arrivalDatetime)}</div>
          <div class="line"><span class="plane">&#9992;</span></div>
          <div class="flightno">Vuelo ${escapeHtml(flightLabel)}</div>
        </div>
        <div class="ap right">
          <div class="iata">${escapeHtml(flight.arrivalCode)}</div>
          <div class="city">${escapeHtml(flight.arrivalCity ?? '')}</div>
          <div class="time">${fmtTime(flight.arrivalDatetime)}</div>
        </div>
      </div>

      <div class="meta">
        <div class="meta-item">
          <div class="lbl">Fecha</div>
          <div class="val">${fmtDateLong(departDate)}</div>
        </div>
        <div class="meta-item">
          <div class="lbl">Embarque</div>
          <div class="val">${boardingTime}</div>
        </div>
        <div class="meta-item">
          <div class="lbl">Puerta</div>
          <div class="val big">${escapeHtml(gate)}</div>
        </div>
        <div class="meta-item">
          <div class="lbl">Asiento</div>
          <div class="val big">${escapeHtml(seat)}</div>
        </div>
      </div>

      <div class="pax">
        <div class="lbl">Pasajero</div>
        <div class="name">${escapeHtml(reservation.passengerName)}</div>
        <div class="doc">
          Documento <span class="mono">${escapeHtml(reservation.passengerId)}</span>
          &middot; Reserva <span class="mono">#${escapeHtml(reservation.reservationId)}</span>
        </div>
      </div>
    </div>

    <div class="perf">
      <div class="notch top"></div>
      <div class="dash"></div>
      <div class="notch bot"></div>
    </div>

    <div class="stub">
      <div class="blk">
        <div class="lbl">Vuelo</div>
        <div class="val">${escapeHtml(flightLabel)}</div>
      </div>
      <div class="blk">
        <div class="lbl">Asiento</div>
        <div class="seatbig">${escapeHtml(seat)}</div>
      </div>
      <div class="blk">
        <div class="lbl">Puerta</div>
        <div class="val">${escapeHtml(gate)}</div>
      </div>
      <div class="barcode">${barcodeBars(checkIn.confirmationNumber)}</div>
      <div class="code">${escapeHtml(confirmCode)}</div>
    </div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=880,height=620');
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
