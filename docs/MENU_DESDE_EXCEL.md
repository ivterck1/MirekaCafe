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
