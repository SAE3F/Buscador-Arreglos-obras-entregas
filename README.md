# SAE Entregas · Tres de Febrero

Buscador y tablero de **entregas, obras y arreglos** de cada institución.
Lee (sin modificar) tres planillas de Google a través de un Apps Script propio.

| Vista | Qué tiene |
|---|---|
| 🔎 Buscador | Búsqueda por institución, ficha con indicadores, línea de tiempo, qué recibió y detalle completo (Excel e impresión) |
| 📊 Vista general | Filtros combinables (tipo, años, categoría, nivel, gestión, localidad, proveedor) y gráficos; institución × categoría |
| 📋 Registros | Todos los registros con búsqueda, orden y Excel |
| 🩺 Calidad de datos | Instituciones que no están en ESTABLECIMIENTOS, nombres unificados y filas con problemas |

## De dónde salen los datos
| Planilla | Hoja | Va como |
|---|---|---|
| BASE DE DATOS | ESTABLECIMIENTOS | Datos de cada institución (nivel, gestión, localidad, CUE, matrícula) |
| BASE DE DATOS | ENTREGAS | Entregas |
| BASE DE DATOS | OBRAS-INFRAESTRUCTURA | Obras |
| SAE \| Tablero Gestión | HISTORICOENTREGAS | Entregas (utensilios y equipamiento 2022–2024) |
| Facturación SAE 2026 | FACTURACION UNIDADES | Utensilios y equipamiento → entregas · Atmosférico y canaletas → arreglos (el servicio alimentario no entra) |
| Facturación SAE 2026 | FACTURACION ITEMS | Arreglos (gas, electricidad, plomería, refrigeración) |

## Archivos
- `index.html` · la página. `css/` estilos (`tokens-3f.css` es el del kit, sin cambios). `js/` lógica:
  `config.js` (URL del script y versión), `datos.js` (carga y copia guardada), `app.js` (vistas), `graficos.js` (gráficos SVG sin librerías), `excel.js` (Excel sin librerías).
- `apps-script/Codigo.gs` · el script que lee las planillas. Cómo publicarlo: `apps-script/PUBLICAR.md`.
- `vercel.json` · encabezados de seguridad del kit. `AGENTS.md` · reglas del ecosistema.

## Probar en la compu
Sin servidor no anda (el navegador bloquea `fetch` con doble clic). Desde la carpeta: `python -m http.server 8000` y abrir <http://localhost:8000>.

## Versiones
Página: `CONFIG.VERSION_PAGINA` (aparece abajo). Script: `VERSION_SCRIPT` en `Codigo.gs`; la página avisa si no coincide con `VERSION_SCRIPT_ESPERADA`.

## Pendiente para más adelante
- **Montos y N° de factura:** ya están preparados. Poner `INCLUIR_MONTOS = true` en `Codigo.gs` y publicar nueva versión: la página suma las columnas sola. Antes, sumar la página al Portal.
- **Sumar al Portal Educación 3F:** pedir a Matías el alta y el `APP_ID`, y pegar el guardián SSO de la plantilla del kit al principio del `<head>` de `index.html`.
- **Nombres que no coinciden:** se agregan en `ALIAS` dentro de `Codigo.gs` (ver pestaña 🩺 Calidad de datos).
