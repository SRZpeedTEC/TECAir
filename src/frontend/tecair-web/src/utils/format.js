// Formatea un número como monto en colones costarricenses (₡)
export const fmtCRC = (n) => '₡' + n.toLocaleString('es-CR');

// Extrae HH:MM de un objeto Date
export const fmtTime = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// Calcula la duración entre dos fechas como "5h 30m"
export const calcDuration = (dep, arr) => {
  const ms      = arr - dep;
  const hours   = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
};

// Rellena un número con cero a la izquierda hasta 2 dígitos
const pad2 = (n) => String(n).padStart(2, '0');

// Formatea una fecha como "dd/mm/aaaa"
export const fmtDate = (d) =>
  d ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}` : '';

// Formatea una fecha de forma corta: "5 jun"
export const fmtDateShort = (d) => {
  if (!d) return '';
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${meses[d.getMonth()]}`;
};
