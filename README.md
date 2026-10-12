# Cotizador · JR Multiservicios

Herramienta web para armar cotizaciones en PDF con la identidad de **JR Multiservicios** (tecnología para hogares y negocios en Bogotá).
Funciona 100 % en el navegador: no necesita servidor ni base de datos, y nada se envía a internet.

## Qué hace
- Formulario de 4 pasos con vista previa del documento en vivo.
- Número de cotización asignado por el registro central (`COT-0001`, `COT-0002`…): no se repite aunque uses varios celulares.
- Calcula el valor a cobrar para que, después de la retención, te quede el neto que quieres ganar.
- Anticipo opcional, con saldo.
- Descarga el PDF, lo comparte (WhatsApp, correo…) y guarda un historial para reabrir o descargar de nuevo.

## Publicar en GitHub Pages
1. Crea un repositorio nuevo (por ejemplo `JR-Cotizador`) y sube estos archivos a la rama `main`.
2. En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
3. Tu herramienta quedará en `https://TU-USUARIO.github.io/JR-Cotizador/`.

Para probarla en tu computador: `python3 -m http.server 8000` dentro de la carpeta y abre `http://localhost:8000`
(no la abras con doble clic: el navegador bloquea el PDF cuando la página viene de `file://`).

## Registro central y dashboard
Cada vez que generas una cotización, el sitio avisa al registro de JR (Supabase) con: tipo, número, fecha, nombre del cliente y valor. Con eso el **dashboard** (`JR-Dashboard`) cuenta los documentos. No se envía el PDF, ni NIT, ni la descripción de las actividades.
Si no hay internet, el PDF se genera igual con un número provisional (`COT-L-XXXXX`) y el aviso se envía solo cuando vuelva la conexión.
La conexión se configura en `config.js` (`supabaseUrl` y `supabaseKey`).

## Personalizar
- `config.js`: teléfono, WhatsApp, textos del encabezado y pie y validez por defecto.
- `assets/logo.png` (logo horizontal) y `assets/icono.png` (monograma cuadrado, usado en el PDF y como favicon): reemplázalos por tus archivos si cambias la marca (PNG transparente, logo mínimo 800 px de ancho).
- `styles.css`: colores y tipografías (variables al inicio del archivo).

## Archivos
```
index.html   estructura de la página
styles.css   estilos de la página y del documento
app.js       lógica: formulario, cálculo, historial y PDF
config.js    datos de la empresa y conexión al registro central
registro.js  aviso al registro central (con cola si no hay internet)
assets/      logo y librerías (jsPDF, html2canvas) incluidas para que funcione sin internet externo
```

## Notas
- El historial para reabrir cotizaciones vive en el navegador (`localStorage`) de cada dispositivo. Si borras los datos del sitio o cambias de celular, ese historial empieza de cero; el conteo del dashboard no se pierde.
- Las fuentes (Manrope e Inter) se cargan desde Google Fonts; sin conexión se usa una fuente del sistema.
