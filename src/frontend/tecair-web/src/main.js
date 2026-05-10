import { createRoot } from 'react-dom/client';
import App from './App.js';
import './styles/main.css';

// Punto de entrada de React: monta la aplicación en el div#root del HTML
createRoot(document.getElementById('root')).render(<App />);
