import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexPath = join(__dirname, '../../../frontend/tecair-web/dist/index.html');

let html = readFileSync(indexPath, 'utf-8');

if (!html.includes('mobile-bootstrap.js')) {
  // Inject before the first <script> so the interceptor is set up before React loads
  html = html.replace('<script', '<script src="/mobile-bootstrap.js"></script>\n    <script');
  writeFileSync(indexPath, html);
  console.log('[TECAir] mobile-bootstrap.js inyectado en index.html');
} else {
  console.log('[TECAir] mobile-bootstrap.js ya estaba inyectado');
}
