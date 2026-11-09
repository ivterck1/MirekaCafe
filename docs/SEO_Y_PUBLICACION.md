# SEO inicial y publicación

La URL de GitHub Pages es una demo provisional. Esta etapa no habilita precios,
WhatsApp ni una publicación comercial definitiva.

## Fuente editorial

Editar exclusivamente `siteConfig.seo` en `js/config.js` para mantener los textos.
`business.description` sigue siendo el lema comercial, independiente del SEO.

- `npm run seo:sync`: actualiza solo el bloque SEO señalado de `index.html`.
- `npm run seo:check`: comprueba sincronización sin escribir archivos.
- `npm test` y `npm run test` incluyen esta comprobación y pruebas SEO.

El HTML versionado ya contiene las etiquetas; no requiere Node en el hosting ni
JavaScript en el navegador. `applySiteConfig()` no reescribe estos metadatos.
Después de editar la configuración, sincronizar, revisar el diff y ejecutar pruebas.
Las referencias de app/config quedan en 1.0.21; CSS conserva 1.0.20.
Antes de publicar ediciones posteriores del JS/config, incrementar también su
referencia `?v=` según AGENTS.md; sincronizar SEO no invalida por sí solo esa caché.

## Demo e indexación

La demo emite una única etiqueta inicial:

```html
<meta name="robots" content="noindex,follow">
```

No se crea robots.txt ni se modifica el robots global del hostname compartido.
No bloquear el rastreo: el buscador necesita acceder a la página para leer noindex.
Noindex no es control de acceso y no elimina instantáneamente páginas ya indexadas.
Hace falta que el buscador vuelva a rastrear; Search Console permite inspeccionar
el estado si se dispone de acceso a la propiedad. La copia publicada no cambiará
hasta autorizar commit y despliegue.

## Canonical y migración

`seo.canonicalUrl` permanece vacío en esta demo noindex. No se emiten canonical ni
og:url, ni se trata GitHub Pages como dominio comercial permanente. Esta omisión
es deliberada; la vista previa social aún está incompleta.

Para el lanzamiento comercial, solo después de confirmar dominio y contenido:

1. Configurar `seo.robots` como `index,follow` y `seo.canonicalUrl` con la URL HTTPS
   absoluta confirmada, sin hash, query ni credenciales. Elegir la URL preferida y
   respetar su directorio y barra final. No inventar un dominio para pasar pruebas.
2. Ejecutar `npm run seo:sync`: generará canonical y og:url iguales. El sincronizador
   rechaza una URL relativa y exige confirmar la URL antes de permitir indexación.
3. Revisar el HTML inicial, las redirecciones, HTTPS, recursos relativos y estado
   de indexación. Si se cambia de dominio, sustituir esa única URL y regenerar.
4. Actualizar en su etapa correspondiente sitemap, JSON-LD y URL absoluta de imagen
   social. No incluir fragmentos de categorías como documentos en un sitemap.
5. Ejecutar pruebas y solicitar autorización antes de publicar. Verificar luego el
   HTML servido y Search Console; las señales de indexación no cambian al instante.

El sincronizador impide combinar la demo noindex con una canonical configurada,
como política de este proyecto; no pretende afirmar que esa combinación sea
un error universal del estándar. No se introduce un elemento base ni un hostname
fijo dentro del motor de la aplicación. Se preservan rutas relativas de recursos.

## Favicon: variante B aprobada e integrada localmente

El usuario autorizó la variante B: logo original completo sobre fondo marfil,
sin recortarlo, deformarlo ni inventar un isotipo. Sustituye la referencia genérica.
La menor legibilidad del wordmark a 16–32 px fue presentada antes de la aprobación.

- `assets/images/brand/favicon.ico`: tres imágenes de 16, 32 y 48 px.
- `assets/images/brand/favicon-96.png`: PNG de 96 × 96 px.
- `assets/images/brand/apple-touch-icon.png`: PNG de 180 × 180 px.

Las referencias son relativas y versionadas con `?v=1.0.21`, compatibles con la
raíz de un dominio y con `/MirekaCafe/`. El PNG original y el logo WebP permanecen
intactos. Las láminas/originales de revisión siguen fuera del directorio público.
No es una implementación de PWA ni cambia la interfaz nativa del navegador.
El favicon de Google Search se gestiona por hostname, no por subdirectorio; su
visualización en pestañas no garantiza una aparición independiente en Google.

## Imagen social futura: requisitos, sin referencias anticipadas

- Composición nueva de 1200 × 630 px, con recursos aprobados; no reemplazar fotos.
- PNG para marca/colores planos o JPEG para composición fotográfica; MIME correcto.
- Producto y logo sin deformación; margen central para recortes y alt fiel al diseño.
- HTTP 200, HTTPS absoluta derivada del entorno confirmado, sin login ni JS.
- Peso orientativo 150–350 KiB; no aumentar artificialmente archivos más ligeros.
- Incorporar og:image, type, width, height y alt y twitter:image y image:alt solo
  cuando el recurso exista y esté aprobado. No emitir cadenas vacías ni rutas ficticias.
- Cambiar twitter:card de summary a summary_large_image cuando se apruebe el recurso.
- Validar las vistas previas reales en redes/mensajería y su caché. Por ahora se emite
  únicamente metadata textual provisional; no se promete una tarjeta con fotografía.
- No añadir twitter:site, creator, sameAs o perfiles sin enlaces verificados.

No se implementan aquí JSON-LD, sitemap, catálogo estático ni archivos especiales de IA.
