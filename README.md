# Landing Restaurante Base

Starter reutilizable para restaurantes, cafeterías y negocios gastronómicos. HTML5, CSS3 y JavaScript Vanilla, sin backend ni dependencias de producción.

## Funcionalidades

Menú dinámico, categorías derivadas del catálogo, destacados (máximo tres disponibles marcados; fallback sin selección), carrito, cantidades, eliminación, subtotal y total, localStorage, formulario, validaciones, mensaje para WhatsApp y panel móvil responsive.

## Estructura del proyecto

- index.html: estructura semántica y textos comunes.
- js/config.js: configuración del negocio, contacto, hero, moneda y WhatsApp.
- js/menu-data.js: productos y categorías.
- css/theme.css: identidad visual, fuentes, radios, sombras y fondos hero.
- css/styles.css: layout, componentes y responsive compartidos.
- js/app.js: motor funcional reutilizable.
- assets/images/brand/: logos y favicon.
- assets/images/hero/: portada y variantes móviles.
- assets/images/products/: imágenes de productos.
- docs/: inventario de migración y resultados de pruebas.
- archive/source-project.zip: respaldo original, excluido de Git; no publicar.

## Crear un nuevo proyecto

Copia esta plantilla o configúrala como GitHub Template Repository y utiliza Use this template. Crea un repositorio independiente por cliente. Personaliza configuración, datos, tema e imágenes sin duplicar lógica funcional.

1. En config.js cambia business, hero y contact. Los campos vacíos no se muestran; redes sociales requieren URL HTTPS completa.
2. Define order.currency y order.locale. Asigna order.storageKey único por cliente para aislar carritos en un mismo origen. No se recuperan carritos del proyecto anterior. Al recargar se toman los precios actuales del catálogo.
3. En menu-data.js conserva el modelo id, nombre, descripcion, precio, categoria, imagen, disponible. Usa ID únicos y estables, precios numéricos no negativos y categorías con su nombre visible. Las categorías se generan automáticamente; Temporada demuestra una categoría sin disponibilidad.
4. Personaliza theme.css: colores principales y secundarios, fondos, tipografías, radios y efectos. Las variables detail-color controlan transparencias y overlays del layout. Comprueba contraste después de cambiar la paleta.
5. Coloca logos en brand/, portada en hero/ y fotos en products/. Actualiza config.images y la ruta imagen de cada producto. El fondo visible del hero usa --hero-image y --hero-image-mobile en theme.css. Cambia favicon en index.html. Los SVG incluidos son placeholders editables.

## Configurar WhatsApp

En config.js establece whatsapp.number con código de país y número aceptado por WhatsApp: solo dígitos, sin +, espacios ni guiones. Activa whatsapp.enabled cuando tengas un número real. La demo está desactivada.

El flujo valida carrito, nombre, entrega y dirección para domicilio; abre un mensaje preparado y el cliente confirma el envío en WhatsApp. El total incluye solo productos, sin cálculo de envío ni impuestos adicionales.

## Cómo probar

Ejecuta python -m http.server 8000 --bind 127.0.0.1 y abre http://127.0.0.1:8000. Comprueba 1440, 390 y 375 px: categorías, agregar, +/-, eliminar, subtotal, total, recarga, formulario, WhatsApp, panel y navegación. Revisa consola, recursos y scroll horizontal. Consulta docs/test-results.json para el resultado automatizado.

## Menú desde Excel e importador

Entrega al nuevo cliente `templates/menu-cliente.xlsx`: MENU contiene categoria, nombre, descripcion, precio, imagen, destacado, disponible y orden; DATOS_NEGOCIO contiene campo/valor; CATEGORIAS contiene categoria/orden. Los ejemplos son ficticios. Para menús extensos, es la fuente inicial recomendada. Sigue [el flujo completo](docs/MENU_DESDE_EXCEL.md) para validar, reunir fotos, detectar faltantes, producir imágenes, normalizar nombres, optimizar a WebP y actualizar catálogo/configuración.

Con Node.js 18 o posterior, instala las herramientas de desarrollo mediante `npm install` (o `npm ci` con el lockfile). SheetJS CE lee los XLSX de clientes y ExcelJS se usa para generar la plantilla. El cliente puede editar el archivo en Excel, LibreOffice u otra herramienta compatible sin preocuparse por estilos ni tablas internas.

```sh
npm run menu:generate
npm run menu:generate -- archivo.xlsx
npm run menu:write -- archivo.xlsx
npm test
npm run test:site
```

La generación normal escribe `tmp/menu-data.generated.js`. Solo --write reemplaza `js/menu-data.js`, después de validar todas las filas. Los errores impiden escribir; las imágenes faltantes generan avisos. DATOS_NEGOCIO se aplica manualmente a config.js con el mapeo documentado. El sitio sigue funcionando abriendo index.html o con servidor estático, sin npm en producción.

El importador respeta el orden de categorías y productos y convierte SI/NO a booleanos. Especialidades muestra hasta tres productos con destacado: true y disponible: true, en el orden del catálogo. Si hay uno o dos disponibles destacados, muestra solo esos; no completa con otros. Solo cuando ningún producto está marcado como destacado usa los primeros tres disponibles como fallback, compatible con catálogos antiguos sin ese campo. Si todos los marcados están agotados, la sección queda sin tarjetas.

Las imágenes se nombran, por ejemplo, `croissant.webp`, y se colocan en `assets/images/products/`. No entregar rutas en Excel. Resolver imágenes pendientes antes de publicar para evitar 404; los placeholders genéricos existentes siguen disponibles. No reutilizar contenido de otros clientes.

`npm test` cubre el importador con archivos y catálogos temporales, incluido --write sin tocar el original. `npm run test:site` necesita Playwright y Chrome. El smoke inicia y cierra su servidor local en un puerto libre. Admite PLAYWRIGHT_MODULE con la ruta del módulo y SITE_URL para usar un servidor alternativo. Intercepta WhatsApp y no envía pedidos.

Resultados de esta entrega: [verificación del menú Excel](docs/VERIFICACION_MENU_EXCEL.md). `tools/create-menu-template.mjs` es una herramienta opcional de autoría para el entorno Codex con @oai/artifact-tool; no se necesita para llenar el Excel ni ejecutar el importador.

## Versionado y caché

Las referencias principales de CSS, JavaScript y favicon en index.html usan `?v=1.0.1`. El parámetro cambia la URL que el navegador guarda en caché. Antes de publicar cambios importantes en CSS, JavaScript o assets reemplazados manteniendo el mismo nombre, incrementar coordinadamente las referencias, por ejemplo **1.0.0 → 1.0.1**. Mantener el orden de scripts config → menu-data → app.

Para una imagen reemplazada, cambiar su nombre o versionar su referencia real (config.images, imagen del catálogo, HTML o url() de theme.css). Cambiar solo la versión del JS/CSS no invalida la caché de las imágenes que este referencia. El Excel acepta únicamente nombres de archivo sin parámetros: preferir un nombre nuevo para fotos actualizadas. Los placeholders actuales se conservan; se versiona el favicon por su caché persistente. No se añaden service workers ni se desactiva la caché.

Publicar únicamente index.html, css/, js/ y assets/. Excluir también tools/, templates/, tmp/, tests/, node_modules/ y archivos npm; no existe paso de build para producción.

## Cómo publicar

Publica únicamente index.html, css/, js/ y assets/ en un hosting estático como GitHub Pages. No requiere build. Excluye archive/, documentación y pruebas del despliegue. Configura productos reales, contacto, WhatsApp y metadatos HTML antes de publicar; los rastreadores pueden no ejecutar JavaScript. Agrega una URL absoluta og:image cuando exista un dominio. Comprueba rutas, HTTPS y un pedido real desde teléfono.

## Antes de iniciar Git

Consulta docs/migration.md. El archivo ZIP conserva material comercial anterior: guarda una copia externa y retíralo de la plantilla al aprobar la migración. Está ignorado por Git, pero un hosting que publique toda la carpeta podría exponerlo. No se ha inicializado Git.
