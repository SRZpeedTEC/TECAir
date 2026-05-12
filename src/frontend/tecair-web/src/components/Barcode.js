// Código de barras SVG decorativo para las tarjetas de embarque
export default function Barcode() {
  // Anchos de barras predefinidos para simular un código de barras real
  const widths = [1,2,1,3,1,1,2,1,2,3,1,1,2,1,1,3,2,1,1,2,1,3,1,2,1,1,3,1,2,1,1,3,1,1,2,1,2,1];
  const bars = widths.map((w, i) => (
    <rect key={i} x={i * 5.2} y="0" width={w * 2} height="32" fill="#1a1320" />
  ));

  return (
    <svg width="200" height="32" viewBox="0 0 200 32">
      {bars}
    </svg>
  );
}
