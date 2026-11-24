# Contexto para seguir el proyecto "SAE Entregas" en otro chat de Claude

> **Cómo usar este archivo:** abrí un chat nuevo, adjuntá este archivo **y** el zip completo del repo
> (`sae-entregas-completo-v0.3.0.zip`, o el que tengas más nuevo desde GitHub) y escribí algo como:
> *"Leé CONTEXTO_SAE_ENTREGAS.md y el zip. Seguimos con la página SAE Entregas desde donde quedó."*
> Si tenés el kit de diseño (`KIT_DISENO_3F.zip`), adjuntalo también.

---

## 1. Quién soy y cómo trabajo (reglas acordadas)

- Soy **Ariana**, del equipo **SAE · Municipalidad de Tres de Febrero** (ecosistema **Portal Educación 3F**).
- Idioma: **español rioplatense con voseo**. Respuestas cortas, claras y sinceras.
- **Regla principal:** salvo que diga **"hazlo"**, **"hazlo ahora"** o **"arrancá"**, **no se programa nada**:
  lo que pida se **anota para la próxima actualización**. Si solo pregunto algo, se contesta corto, sin programar.
- **Entregas:** un `.zip` con **solo los archivos que cambiaron**, con rutas desde la raíz del repo. Decir siempre:
  qué versión tiene que aparecer abajo en la página y **si hay que volver a publicar el Apps Script**.
- **Nunca mandar `js/config.js` en las actualizaciones** (tiene mi URL del script). Las versiones van en `js/version.js`.
- **Nunca hacer push al repo**: lo subo yo (GitHub → Vercel).
- La página es **solo de lectura**: no escribe ni modifica planillas hasta nueva orden.
- Antes de escribir en cualquier planilla real del equipo: decir exactamente qué se cambia y esperar mi OK.
- **Repo público:** nada de teléfonos, mails personales, CUIT, montos, N° de factura/remito ni claves en el código.
- Probar siempre: compu y celular, modo claro y oscuro, sin scroll hacia el costado.
- Todo lo que diga **"Sin tipo" / "Sin categoría" / "Sin rubro" / "Sin dato"** va **siempre al final** (filtros, gráficos, tablas, Excel). Si hay "Otras", va anteúltimo.

## 2. Qué es la página

**SAE Entregas** (`SAE <naranja>Entregas</naranja>`): buscador y tablero de **entregas, obras y arreglos** de cada
institución, más completo y profesional que la sección "Entregas, obras y arreglos" de **SAE Gestión 3F**
(`https://sae-gestion3f.vercel.app`, repo `SAE3F/buscador-jardines`), que fue la referencia.

- HTML/CSS/JS estático, **sin librerías** (gráficos SVG propios, Excel `.xlsx` generado en el navegador).
- Hosting: **GitHub + Vercel** (página estática, sin build).
- Diseño: **kit 3F** (`css/tokens-3f.css` sin cambios; Inter + Montserrat; azul `#163C68`, naranja `#F69321`; modo oscuro con clase `dark` en `<html>`).
- **Todavía NO está en el Portal Educación 3F** (sin guardián SSO). Se suma cuando esté estable: pedir a **Matías** el alta y el `APP_ID`
  y pegar el guardián SSO de la plantilla del kit al principio del `<head>`.

### Vistas
| Vista | Contenido |
|---|---|
| 🔎 Buscador | Autocompletado; lista de instituciones con filtros (nivel, gestión, localidad, mostrar, ordenar por, y en "➕ Más filtros": sin movimientos desde hace…, actividad desde/hasta, tiene/nunca recibió categoría, proveedor, incluir sin fecha exacta). Filtros recordados en `localStorage`. **Ficha**: datos de ESTABLECIMIENTOS, indicadores, línea de tiempo (por año / por mes), "Qué recibió", detalle E/O/A con filtros (buscar, período, desde/hasta, año, mes, categoría, proveedor, orden, sin fecha exacta), botones 📄 Ver en planillas, 🔗 Copiar link, ⬇️ Excel, 🖨️ Imprimir, ↗ por registro |
| 📊 Vista general | Filtros (tipo, medir por registros/unidades, años, categoría, nivel, gestión, localidad, proveedor). Indicadores (el de "Sin ningún registro" va último). Gráficos: por año, por categoría, ranking de instituciones (Más / Menos [≥1] / Sin registros, Ver todas, Excel), por proveedor (rubros debajo del nombre, tooltip y resumen al tocar), por nivel, por localidad, tabla institución × categoría (encabezados verticales, Institución y Total fijos) |
| 📋 Registros | Todos los registros: buscar, tipo, año, categoría, proveedor, planilla, orden por columna, paginado, Excel. Columnas de ancho fijo, una línea por fila, ↗ por registro |
| 🩺 Calidad de datos | Avisos agrupados por problema (no está en ESTABLECIMIENTOS, fila sin institución, detalle nombra otra institución, SIN DATOS, obra sin tipo, repetida, escrita de otra forma ya unificada, hoja ilegible). Filtro por planilla. Tocar el aviso abre la planilla en la celda; "Ver ficha" aparte |

## 3. De dónde salen los datos (todo vía Apps Script propio, solo lectura)

| Planilla (ID) | Hoja | Código | Uso |
|---|---|---|---|
| **BASE DE DATOS** `1HHI99Y8T2MAII1cFBRV8sJ1rhSOwoel42qt_KeDAFuw` | ESTABLECIMIENTOS | ES | Datos de cada institución: INSTITUCION, NOMBRE COMPLETO, GESTIÓN, TIPO, NIVEL, CUE, MATRICULA / CUPO S.A.E 2026, SERVICIO SAE, LOCALIDAD (no tiene zona) |
| BASE DE DATOS | ENTREGAS | EN | Entregas: Fecha_Entrega, AÑO, INSTITUCION, Categoria, Descripcion_material, Cantidad, Tipo, Estado, Tipo de Institucion |
| BASE DE DATOS | OBRAS-INFRAESTRUCTURA | OB | Obras: Año, INSTITUCION, Tipo de Obra, Detalle _obra ("EP 07 \| REFACCION…"), Cantidad, Categoria. Sin fecha exacta |
| **SAE \| Tablero Gestión** `1P57PeQ8WeLJbEovcGNKsT-4K_2AmCXpWF1W-MrwYShQ` | HISTORICOENTREGAS | HI | Matriz AÑO \| TIPO \| DETALLE \| una columna por escuela (cantidades). 2022–2024, utensilios y equipamiento. (BUSCADOR ENTREGAS es solo una vista con fórmulas de esta hoja) |
| **Facturación SAE 2026** `1mku6iQQSy2Vjfa51QhXJ_WUMphHIlT3yYvMdB3baiIc` | FACTURACION ITEMS | IT | Arreglos: fecha ("Columna 1"), SERVICIO (GAS 2025/2026, ELECTRICIDAD 2026, PLOMERIA 2026, REFRIGERACION…), PROVEEDOR, OC, N°ITEM, DETALLE, UNIDADES, MONTO, N° FACTURA, ESCUELA. Las columnas N–P son un catálogo aparte (no se usan) |
| Facturación SAE 2026 | FACTURACION UNIDADES | UN | SERVICIO que empieza con UTENSILIOS/EQUIPAMIENTO → **entrega**; ATMOSFERICO/CANALETAS → **arreglo**; el resto (SAE/MESA/COLONIAS = servicio alimentario) **no entra**. Institución en OBSERVACIONES; cantidad en "UNIDADES A FACTURAR" |

- **ANEXO PROVEEDORES** (Facturación) solo tiene código, dirección, CUIT y estado: **no se usa** (no mostrar CUIT).
- **Montos y N° de factura:** preparados pero **apagados** (`INCLUIR_MONTOS = false` en `Codigo.gs`). Si se activan, la página agrega las columnas sola. Antes, conviene sumar la página al Portal.
- Totales de referencia en SAE Gestión (para comparar): 3.201 entregas, 323 obras, 794 arreglos.

## 4. Archivos del repo

```
index.html            vistas y estructura
css/tokens-3f.css     del kit, sin cambios
css/app.css           estilos propios (al final hay bloques "v0.2.0" y "v0.3.0")
js/config.js          SOLO CONFIG.SCRIPT_URL (de Ariana; no viene en actualizaciones)
js/version.js         VERSION_PAGINA y VERSION_SCRIPT_ESPERADA (viene en cada actualización)
js/util.js            utilidades: esc, n (es-AR), norm, íconos por categoría, esSin/ordenTexto/sinAlFinal, urlCelda/abrirCelda
js/excel.js           exportarExcel(nombre, hojas) sin librerías
js/datos.js           carga (copia en localStorage + fetch al script), prepara registros, aviso de versiones
js/graficos.js        G.columnas (apiladas), G.barrasH, G.secuencial, tooltips
js/app.js             toda la interfaz (estado S, vistas, filtros, ficha, calidad, eventos)
apps-script/Codigo.gs   script de solo lectura (VERSION_SCRIPT)
apps-script/PUBLICAR.md pasos para publicarlo
vercel.json, AGENTS.md, assets/ (del kit), README.md
```

### Contrato de datos (lo que devuelve el script)
`{ ok, version, generado, montos, resumen, hojas:{COD:{id,gid,hoja,planilla}}, instituciones:[…], registros:[…], avisos:[…] }`

- **Registro** (array): `[0 tipo E|O|A, 1 año, 2 fecha AAAA-MM-DD o '', 3 id institución, 4 categoría, 5 detalle, 6 cantidad, 7 proveedor, 8 fuente, 9 servicio/OC, 10 estado, 11 monto|null, 12 factura|null, 13 hoja, 14 fila, 15 columna]`
- **Institución:** `{ id, nombre, completo, gestion, tipo, nivel, cue, matricula, servicio, localidad, enBase, ref:[hoja,fila,col], alias:[…], aliasRef:{nombre:[hoja,fila,col]} }`
- **Aviso:** `{ tipo: sin_inst|sin_tipo|otra_inst|repetida|sin_datos|hoja, h, hoja, fila, col, texto }`
- **Nombres de institución** normalizados con `idInst_()` (mayúsculas, sin acentos, "EP 8"→"EP 08", "SEC 2 (EES 02)"→"EES 02", EP/EES con 2 dígitos, el resto sin ceros). Equivalencias manuales en `ALIAS` dentro de `Codigo.gs`.
- **Botón ↗:** abre `https://docs.google.com/spreadsheets/d/ID/edit?r=<timestamp>#gid=GID&range=A1` en una pestaña con nombre fijo por planilla (`sae_planilla_<ID>`), así reusa la misma pestaña. No puede tomar una pestaña que el usuario abrió a mano (límite del navegador).
- Cache del script: CacheService 10 min en trozos; `?actualizar=1` lo rehace (botón 🔄 Actualizar).
- Prueba local: servir la carpeta (`python -m http.server 8000`) y usar `?datos=archivo.json` con un JSON del mismo formato.

## 5. Estado actual (24/11/2026)

- **Página:** versión **0.3.0** entregada (zip con archivos cambiados). Falta que Ariana confirme que la subió.
- **Apps Script:** versión **1.1.0** publicada por Ariana como aplicación web ("Ejecutar como: Yo", "Cualquier persona"). La URL está en su `js/config.js`.
- Historial: 0.1.0 (primera versión) → 0.1.1 (tablas de ancho fijo, una línea) → 0.2.0 (script 1.1.0: ir a la celda, calidad por problema, ranking Menos/Sin registros, "Sin tipo" al final, encabezados verticales) → 0.3.0 (copiar link con respaldo, aviso clicable, version.js, 12 filtros nuevos, tabla institución × categoría con columnas fijas, info de proveedores).

## 6. Pendientes y temas abiertos

- **Nada anotado para la próxima actualización** en este momento.
- **En consulta (NO anotado todavía):** cargar **remitos y facturas** enlazados a cada registro. Opciones conversadas:
  1. Link de Drive en una columna nueva de la planilla y botón 📎 en la página (simple, sigue siendo solo lectura).
  2. Subir el archivo desde la página → Apps Script lo guarda en Drive y escribe el link en la fila (deja de ser solo lectura; hacerlo con la página ya en el Portal).
  3. Servidor propio (no se recomienda por ahora).
  Ariana lo está consultando con sus superiores.
- **Más adelante:** sumar al Portal Educación 3F (Matías, `APP_ID`, guardián SSO); activar montos; conectar con el mapa que ya existe.

## 7. Cosas a tener en cuenta

- En Windows, **no abrir los `.js` con doble clic** (los ejecuta Windows Script Host y da error "window no está definido"): abrir con Bloc de notas o VS Code.
- Obras, HISTORICOENTREGAS y parte de ENTREGAS **solo tienen año**: los filtros por mes/fecha usan la casilla "Incluir registros sin fecha exacta".
- Si Chrome bloquea los ↗, hay que permitir ventanas emergentes para la página.
- Si la página avisa de versiones, el cartel dice cuál quedó atrasado (script o página).
