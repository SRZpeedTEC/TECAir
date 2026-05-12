// Paleta de colores para cada estado de asiento
const COLORS = {
  available:   { body: '#fff',    border: '#d4b8c4', head: '#f7eef2', text: '#5b1936' },
  selected:    { body: '#5b1936', border: '#3d0f24', head: '#7a2347', text: '#fff'    },
  'your-other':{ body: '#f7eef2', border: '#5b1936', head: '#e7d5dd', text: '#5b1936' },
  occupied:    { body: '#ede9e6', border: '#cac4bf', head: '#e0dad6', text: '#b3a8a3' },
};

// Icono SVG de asiento de avión con variantes de color según su estado
export default function SeatIcon({ variant, label, size = 38 }) {
  const c = COLORS[variant] || COLORS.available;

  return (
    <svg width={size} height={size} viewBox="0 0 36 40" xmlns="http://www.w3.org/2000/svg">
      {/* Reposa pies */}
      <rect x="7"  y="35" width="22" height="3.5" rx="1.8" fill={c.border} opacity="0.55" />
      {/* Cojín del asiento */}
      <rect x="3"  y="22" width="30" height="13"  rx="5"   fill={c.body}   stroke={c.border} strokeWidth="1.5" />
      {/* Respaldo */}
      <rect x="5"  y="7"  width="26" height="17"  rx="4"   fill={c.body}   stroke={c.border} strokeWidth="1.5" />
      {/* Apoya cabeza */}
      <rect x="9"  y="3"  width="18" height="9"   rx="3.5" fill={c.head}   stroke={c.border} strokeWidth="1.2" />
      {/* Apoya brazos */}
      <rect x="1"  y="23" width="5"  height="9"   rx="2.5" fill={c.border} opacity="0.7" />
      <rect x="30" y="23" width="5"  height="9"   rx="2.5" fill={c.border} opacity="0.7" />

      {/* Número de pasajero asignado */}
      {label ? (
        <text
          x="18" y="32" textAnchor="middle" dominantBaseline="middle"
          fontSize="9" fontWeight="700" fontFamily="Inter,sans-serif" fill={c.text}
        >
          {label}
        </text>
      ) : null}

      {/* Cruz para asientos ocupados */}
      {variant === 'occupied' ? (
        <text
          x="18" y="30" textAnchor="middle" dominantBaseline="middle"
          fontSize="13" fontWeight="400" fontFamily="sans-serif" fill={c.text} opacity="0.5"
        >
          ×
        </text>
      ) : null}
    </svg>
  );
}
