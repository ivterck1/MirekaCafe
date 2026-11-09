# Catálogo HTML y mejora progresiva

`js/menu-data.js` es la fuente del catálogo. `index.html` incluye una proyección
generada dentro de los marcadores MENU. Edita los datos autorizados y ejecuta
`npm run menu:html:sync` para regenerar solo ese bloque. Ejecuta
`npm run menu:html:check` para comprobarlo sin escribir. Las pruebas también
detectan una proyección desactualizada.

El bloque reúne las categorías en su orden original y presenta los productos
disponibles con rutas relativas. Los importes se omiten del HTML generado y
las tarjetas muestran «Precio pendiente». El índice utiliza anclas nativas.
Cuando la app prepara el carrito, comprueba categorías e IDs, agrega los
controles a las tarjetas y activa el filtro. Si el catálogo JS no carga o
los IDs discrepan, permanece disponible la vista de consulta.

GitHub Pages sirve los archivos estáticos versionados. Node.js se utiliza para
generar y verificar la salida en desarrollo. Publica el bloque y el catálogo JS
de la misma revisión. Respeta las versiones de recursos indicadas en AGENTS.md.

## Preparación para Excel en 3.2

1. Validar las hojas de productos y categorías antes de escribir archivos.
2. Crear un modelo ordenado en memoria con disponibilidad, descripción, ruta
   de imagen, precio provisional y un ID persistente por producto. Migrar los
   IDs actuales a ese modelo antes de admitir renombres o cambios de categoría.
3. Serializar el mismo modelo como `js/menu-data.js` y pasar sus productos a
   `synchronizeMenu()` para construir el `index.html` candidato. Conservar
   la configuración comercial como entrada separada.
4. Crear ambos candidatos en un espacio temporal. Comprobar equivalencia,
   fotos, diferencias de inventario, carritos guardados y pruebas del sitio
   antes de promover el par de salidas.
5. Publicar ambos archivos juntos. Revertirlos como una unidad si falla la
   revisión posterior. Revisar explícitamente las bajas, porque una línea
   inválida puede invalidar un carrito guardado con el comportamiento actual.

Esta fase utiliza el importador Excel existente. La migración de IDs y la
escritura conjunta de los dos candidatos pertenecen a 3.2.
