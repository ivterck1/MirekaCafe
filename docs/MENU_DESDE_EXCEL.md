# Menú desde Excel

Cliente → `templates/menu-cliente.xlsx` → validación → fotografías entregadas por cliente → identificar fotografías faltantes → generar o producir imágenes faltantes → normalizar nombres → optimizar a WebP → actualizar `js/menu-data.js` → actualizar `js/config.js` → pruebas → publicación.

Entrega al cliente una copia de la plantilla. Sus cuatro productos son ficticios: reemplazarlos antes de publicar. Conservar exactamente los nombres de hojas y encabezados en la fila 1. No usar fórmulas, celdas combinadas ni texto monetario en el catálogo.

## MENU

Todas las columnas son obligatorias en cada fila de producto. Las filas totalmente vacías se ignoran.

| Columna | Regla |
|---|---|
| categoria | Coincidencia exacta con CATEGORIAS, incluidos acentos. Se recortan espacios exteriores. |
| nombre | Nombre comercial. Se combina con la categoría para generar el ID técnico. |
| descripcion | Texto breve; se recomiendan 100–140 caracteres como máximo. Más de 140 produce aviso. |
| precio | Número no negativo, sin $, MXN ni texto; admite cero. En texto solo se acepta decimal con punto. |
| imagen | Solo archivo, por ejemplo croissant.webp. Minúsculas, números, guiones o guion bajo; sin espacios, acentos, rutas ni parámetros. Se aceptan webp, png, jpg, jpeg y svg. Preferir WebP. |
| destacado | SI o NO, en mayúsculas. Se convierte a booleano y selecciona las especialidades. |
| disponible | SI o NO. NO conserva el producto, pero el motor impide comprarlo y lo oculta del catálogo visible. |
| orden | Número entero positivo. Ordena productos dentro de su categoría. |

El importador genera automáticamente el ID técnico a partir de **categoría + nombre**. Por ejemplo, «Frappés» + «Chocolate» genera `frappes-chocolate`. Usa minúsculas, elimina acentos y sustituye grupos de espacios y caracteres especiales por un solo guion, sin guiones al principio ni al final. El número de fila y el campo `orden` no afectan al ID.

Puedes usar el mismo nombre en categorías distintas. Repetir el mismo producto dentro de una categoría es un error; también se rechazan combinaciones distintas que produzcan el mismo ID tras normalizarse. Cambiar la categoría o el nombre puede cambiar el ID. Si vuelves a importar un catálogo generado con la regla anterior (solo nombre), revisa los carritos guardados antes de publicar y, si corresponde, renueva `order.storageKey`.

## CATEGORIAS y favoritos

Columnas `categoria` y `orden`, ambas obligatorias. Orden entero positivo. Se ordenan categorías por orden y después productos por su orden dentro de cada categoría; empates conservan el orden de las filas. El sitio deriva filtros de la primera aparición en el catálogo. Una categoría sin productos genera aviso y no tendrá filtro; una categoría con todos sus productos no disponibles sí conserva su filtro.

Marca los favoritos con SI en destacado. La sección de especialidades muestra como máximo tres productos con destacado: true y disponible: true, respetando el orden del catálogo generado (categoría y orden del producto). Si hay uno o dos disponibles destacados, muestra únicamente esos; no completa con productos no destacados. Si ningún producto está marcado como destacado, usa los primeros tres disponibles como fallback; también funciona con catálogos antiguos sin ese campo. Un destacado no disponible no aparece. Si todos los marcados están agotados, no hay tarjetas de especialidades: el fallback solo se aplica cuando no existe ninguna marca destacado: true. La selección no altera el orden de los filtros ni del menú.

## DATOS_NEGOCIO

Estructura campo/valor. El importador solo convierte MENU y CATEGORIAS: esta hoja se revisa y aplica manualmente, sin sobrescribir config.js.

| Campo Excel | Destino en siteConfig |
|---|---|
| nombre / nombre_corto / descripcion | business.name / shortName / description |
| whatsapp / whatsapp_activo | whatsapp.number / enabled (SI → true, NO → false) |
| horario / direccion / cobertura | contact.hours / address / coverage |
| instagram / facebook | contact.instagram / facebook (URL HTTPS completa o vacío) |
| moneda / locale | order.currency / locale |

México: WhatsApp = **52 + número de 10 dígitos**, sin +, espacios ni guiones. Guardarlo como texto. Dejar whatsapp_activo en NO hasta configurar y comprobar un número real. Configurar además hero, images y una storageKey exclusiva del negocio; revisar metadatos de index.html.

## Fotografías

El Excel indica `croissant.webp`; la salida usa `assets/images/products/croissant.webp`. Inventariar las fotos del cliente y relacionarlas con los productos. Si falta una, el importador avisa «Imagen pendiente» y permite generar. Solicitarla o producir una imagen representativa acordada con el cliente; no reutilizar fotos de otros negocios. Normalizar nombres y optimizar a WebP antes de publicar. Durante preparación puede usarse `placeholder.svg`, ya incluido. Una foto faltante puede provocar un 404 antes de que el motor muestre el placeholder: resolver todos los avisos antes de producción.

## Importar y revisar

El cliente puede editar el XLSX en Excel, LibreOffice u otra herramienta compatible. SheetJS CE lee los valores de MENU y CATEGORIAS; ExcelJS se usa para generar nuestra plantilla con sus estilos y controles. El cliente no necesita conservar estilos, filtros ni tablas internas. El importador no ejecuta fórmulas ni macros ni sigue enlaces externos. Usa valores simples en los campos obligatorios, sin fechas ni fórmulas.

Desde la raíz del proyecto, con Node.js 18 o posterior:

```sh
npm install
npm run menu:generate
npm run menu:generate -- ruta/menu.xlsx
npm run menu:write -- ruta/menu.xlsx
npm test
```

Sin --write solo se genera `tmp/menu-data.generated.js`; el catálogo original queda intacto. Revisar diferencias y avisos antes de usar --write. Los errores incluyen hoja y fila; cualquier error impide escribir tanto la salida temporal como el catálogo. Los archivos generados anteriores pueden seguir existiendo: una ejecución fallida no los actualiza. --write reemplaza js/menu-data.js solamente después de validar todo el libro de menú. Guardar copia o revisar cambios en Git antes de reemplazarlo.

No instalar npm en producción. El Excel, tools, tests, templates, node_modules y tmp son material de desarrollo. La web sigue siendo estática.

## Pruebas y publicación

Ejecutar npm test y el flujo del README a 1440, 390 y 375 px. Comprobar categorías, especialidades, precios, carrito, cantidades, eliminación, persistencia, formulario y URL de WhatsApp interceptada sin enviar pedidos. Revisar consola, 404 y scroll horizontal. Comprobar también el catálogo importado en una copia del sitio y resolver fotos pendientes. Incrementar ?v= antes de publicar cambios relevantes; publicar únicamente index.html, css, js y assets.
## Vista previa de Mireka Café v2

### Menú de NODAGRAMA Studio Manager

Ejecuta `npm run studio` desde el proyecto. La opción **Seleccionar Excel** acepta una ruta o un número de la lista. La carpeta predeterminada es `client-input/`. Para cambiarla en PowerShell, ejecuta `$env:STUDIO_EXCEL_DIR = 'C:\ruta\a\los\excel'` antes de iniciar. Se listan solo archivos XLSX del primer nivel y se omiten los archivos de bloqueo de Excel.

1. Selecciona el Excel y elige **Crear vista previa**. **Consultar cambios** permite filtrar por hoja, ID y campo. Deja un filtro vacío para ver todos sus valores.
2. Elige **Generar candidatos**. Revisa la ruta, los archivos modificados y el parche. Si cambia el Excel o alguna dependencia, crea una vista previa nueva y vuelve a generar.
3. Elige **Revisar y aplicar**. El menú distingue los cambios aplicables de las solicitudes pendientes. Escribe `APLICAR` solo para confirmar el conjunto que se acaba de mostrar. El motor vuelve a verificarlo al aplicar y muestra el respaldo, la bitácora y el manifiesto.
4. Usa **Consultar respaldos** para ver ID, fecha UTC, estado, ruta y resumen de la bitácora. Escribe `DETALLES` para ver la bitácora completa. En **Restaurar respaldo**, selecciona el respaldo y escribe `RESTAURAR` después de revisar el aviso. Si hay una operación interrumpida, se usa la recuperación con las mismas comprobaciones de huellas.

El menú mantiene la selección, la vista previa y los candidatos de esta sesión. Los comandos técnicos de las secciones siguientes siguen disponibles para trabajar con artefactos de sesiones anteriores. El menú conserva la ubicación privada de los respaldos y los bloqueos comerciales.

La Fase 3.2B.1 usa la revisión publicada `1b8307e5a994bccda7471a929ad64923f70c2a33`.

1. Ejecuta `npm run menu:template:v2`. El generador usa el runtime de hojas de cálculo de Codex. En otro entorno, `MIREKA_NODE_MODULES` puede señalar al directorio de módulos que contiene `@oai/artifact-tool`.
2. Abre una copia de `tmp/catalogo-v2/menu-mireka-v2-control.xlsx`. El generador protege esa ruta contra sobrescritura y las plantillas anteriores conservan sus nombres. Para usar un libro v2 comercial anterior, agrega la fila `mostrar_precios` con valor `NO`.
3. Ejecuta `npm run menu:preview -- ruta/al/archivo.xlsx`. Revisa el JSON en `tmp/catalogo-v2/`. El nombre incluye la huella del libro y un reporte bloqueado devuelve código de salida 1.

Conserva `id` al cambiar nombres u orden. Al mover un producto, actualiza juntos `categoria` y `categoria_id`. Para proponer un alta, indica `alta:<id>` en la columna `id`. En referencias a una categoría nueva, usa su ID sin el prefijo. Una fila omitida produce una baja propuesta. El orden de partida se reconstruye a partir de la secuencia publicada.

El libro sin columnas de ID solo permite diagnosticar coincidencias exactas. La vista previa no aplica cambios. Los comandos heredados usan la plantilla anterior y no aceptan los encabezados v2.

### DATOS_NEGOCIO en la plantilla v2

Edita `valor` y conserva la clave de la columna `campo`. Nombre, nombre corto, descripción, solicitud de WhatsApp, moneda y locale son obligatorios. Los demás campos son opcionales. Una celda opcional vacía conserva el valor de referencia. Para proponer su retiro escribe `[BORRAR]`. Las fórmulas y las claves fuera del esquema bloquean la vista previa.

- Captura `telefono` y `whatsapp` como texto. El teléfono admite `+` internacional y conserva los ceros iniciales. WhatsApp usa el formato internacional de solo dígitos que espera el sitio.
- Para Instagram, Facebook y TikTok puedes proporcionar un usuario, con o sin `@`, o una URL HTTPS directa al perfil. Los usuarios se convierten en enlaces de la plataforma con una advertencia informativa. Solo se comprueban formato y plataforma. La existencia y titularidad del perfil no se verifican.
- `whatsapp_activo=SI` y `mostrar_precios=SI` generan solicitudes en el reporte. Los controles de pedidos, WhatsApp y precios no se escriben desde Excel. La plantilla de control inicia ambos en `NO`.
- La plantilla v2 anterior sigue siendo consultable. Si falta la hoja comercial, el reporte indica que solo se revisó el catálogo.

El esquema y la validación están en `tools/business-preview.cjs`. El adaptador `tools/site-business-adapter.cjs` traduce la configuración local a las claves de la hoja. Para otro cliente, se puede reutilizar el validador con su esquema y sustituir el adaptador, el registro de categorías y la fuente del catálogo. Los reportes incluyen datos comerciales y se mantienen en `tmp/`.

### Generación de candidatos

1. Ejecuta `npm run menu:preview -- ruta/al/archivo.xlsx` y revisa el JSON que imprime el comando.
2. Usa ese mismo libro y su reporte con `npm run menu:candidates -- ruta/al/archivo.xlsx ruta/a/vista-previa.json`.
3. Revisa `sitio/`, `diferencias.patch` y `reporte-diferencias.json` en el directorio `tmp/candidatos-*/` indicado. El reporte incluye huellas de originales y candidatos y distingue el conjunto potencialmente publicable de los archivos privados.

El comando recalcula el plan y rechaza discrepancias en el Excel, la revisión, las fuentes, el generador o los recursos referenciados. Las tres hojas deben estar presentes. Errores, altas y bajas pendientes bloquean esta etapa. La generación normal conserva el modo comercial vigente y bloquea cambios protegidos cuando está activo. El HTML candidato sincroniza catálogo, descripción comercial, contacto, footer y SEO y actualiza las versiones de scripts que cambian. La carpeta candidata es privada y no constituye autorización de publicación.

La descripción SEO editorial existente se conserva hasta que se aprueba un cambio en la descripción comercial. A partir de ese cambio se sincronizan la descripción visible y las descripciones de buscadores y redes. La demo conserva `noindex,follow` y deja los datos estructurados comerciales pendientes de confirmación. Los textos editoriales del hero se administran aparte.

El enlace social llega al sitio local solo al aplicar el conjunto aprobado. Cambiar de cuenta invalida la vista previa y exige una aprobación nueva. Los enlaces de publicaciones, redirecciones y URLs con parámetros de seguimiento deben sustituirse por la URL directa del perfil. Facebook también admite el formato `profile.php?id=<número>`. Una celda vacía conserva el enlace y `[BORRAR]` propone quitarlo. Un teléfono confirmado y aplicado genera un enlace `tel:` independiente del destinatario de pedidos. Para regenerar el HTML comercial tras una edición directa de configuración, usa `npm run menu:business:sync`.

### Aplicación local y recuperación

Revisa el parche, los candidatos y el reporte. Copia `aprobacionSha256` de `reporte-diferencias.json` solo después de aprobar ese conjunto.

```powershell
npm run menu:apply -- <Excel> <vista-previa.json> <directorio-candidato> --approve <aprobacionSha256>
npm run menu:restore -- <respaldo-ID>
npm run menu:restore -- <respaldo-ID> --recover
```

El comando imprime el respaldo privado. En Mireka Café se crea en `C:\Users\admin\Documents\HANT\NODAGRAMA_Backups\MirekaCafe` por defecto. Configura otra carpeta base con `$env:STUDIO_BACKUPS_DIR = 'C:\ruta\privada'`. Studio agrega la carpeta estable del cliente. Conserva los respaldos fuera de Git y de la raíz web, en el mismo volumen que el sitio. Los respaldos anteriores siguen disponibles en TEMP mientras existan y se conservan en su ubicación. El comando `menu:restore` recibe solo el **ID** `respaldo-…`. Solo se permiten `index.html`, `js/menu-data.js` y `js/config.js`. Cambios pendientes de SEO impiden aplicar hasta que se coordine esa etapa.

El bloqueo se libera al terminar el proceso. El estado persistente distingue una operación terminada de una interrupción. Si el proceso cae durante una aplicación o reversión, usa `--recover` con el ID indicado. La recuperación restaura el conjunto original si los archivos coinciden con las huellas previstas. Una edición posterior ajena al conjunto bloquea la recuperación y requiere revisión manual. Las sustituciones son por archivo. Mientras se escribe o se recupera el conjunto, puede haber una combinación temporal de versiones. El manifiesto solo se emite después de verificar los archivos aplicados y se anula al restaurarlos.

### Autorización comercial en Studio

| Estado | `mostrar_precios` | `whatsapp_activo` |
| --- | --- | --- |
| Catálogo informativo | NO | NO |
| Catálogo con precios | SI | NO |
| Catálogo con pedidos | SI | SI, con destinatario internacional válido |
| Combinación inválida | NO | SI |

1. En Excel, completa ambos valores con `SI` o `NO`. Para activar precios, cada producto disponible debe tener un importe numérico y positivo en MXN con un máximo de dos decimales. Un importe de `1` MXN es válido y queda sujeto a la misma autorización comercial explícita que los demás precios. Studio muestra los IDs que impiden la autorización.
2. En `npm run studio`, crea la vista previa y elige **8. Generar candidatos comerciales**. Para desactivar, solicita `NO` en el campo correspondiente. La opción normal de candidatos conserva el modo vigente.
3. En **Revisar y aplicar**, escribe `APLICAR` y revisa el modo, la lista exacta de productos e importes, la disponibilidad, la configuración y el destinatario. Teclea la frase `AUTORIZAR …` que se genera para esa ejecución. Cambiar el libro, el destino, los precios u otra dependencia exige una nueva revisión. Studio registra la huella, usuario local cuando está disponible, fecha UTC y estados anterior y nuevo en la bitácora.
4. Usa **Restaurar respaldo** para volver al estado anterior. Si la restauración reactiva un modo o repone datos comerciales activos distintos, Studio solicita una nueva frase de autorización. Las operaciones que requieren la frase se completan desde Studio. Los comandos técnicos siguen disponibles para las operaciones normales.

El catálogo sin JavaScript muestra los precios autorizados en el HTML. El carrito y la apertura de WhatsApp requieren JavaScript. El sitio prepara el mensaje después de validar el pedido y lo deja listo para revisión y envío manual en WhatsApp.
