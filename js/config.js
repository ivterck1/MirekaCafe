// Personaliza estos datos para cada negocio. No incluyas secretos.
const siteConfig = {
  business: {
    name: "Mireka Café",
    shortName: "Mireka",
    description: "Cafetería de Autor"
  },
  // Fuente editorial del HTML inicial. Ejecutar npm run seo:sync al editar.
  seo: {
    title: "Mireka Café | Cafetería de autor y menú",
    description: "Conoce el menú de Mireka Café: café, bebidas, crepas y antojos. Consulta nuestras opciones de servicio y disfruta a tu manera.",
    robots: "noindex,follow",
    locale: "es_MX",
    canonicalUrl: ""
  },
  whatsapp: { number: "525562524763", enabled: false },
  hero: {
    eyebrow: "Mireka Café · Cafetería de Autor",
    title: "El sabor de tus mejores momentos.",
    description: "Café, bebidas y antojos para disfrutar a tu manera."
  },
  contact: {
    hours: "Lunes a sábado, 9:00 a 21:00",
    address: "Retorno 5 de Manuel Rivera Cambas 32 (al lado de las canchas), Ciudad de México",
    coverage: "Cobertura de entrega pendiente de confirmación.",
    instagram: "",
    facebook: ""
  },
  order: {
    currency: "MXN",
    locale: "es-MX",
    storageKey: "landing-restaurante-base:cart:v1",
    pricesApproved: false,
    deliveryModes: [
      { id: "recoger", label: "Recoger en establecimiento", requiresAddress: false },
      { id: "domicilio", label: "Servicio a domicilio", requiresAddress: true }
    ]
  },
  images: {
    logo: "assets/images/brand/mireka-logo-web.webp",
    hero: "assets/images/hero/mireka-hero-desktop.webp",
    productPlaceholder: "assets/images/products/placeholder.svg?v=1.0.12"
  }
};
