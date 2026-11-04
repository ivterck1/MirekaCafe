// Personaliza estos datos para cada negocio. No incluyas secretos.
const siteConfig = {
  business: {
    name: "Mireka Café",
    shortName: "Mireka",
    description: "Cafetería de Autor"
  },
  whatsapp: { number: "525562524763", enabled: false },
  hero: {
    eyebrow: "Tu menú, a un mensaje",
    title: "Elige tu próximo antojo.",
    highlight: "Pide a tu manera.",
    description: "Explora el menú de Mireka Café."
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
    logo: "assets/images/brand/placeholder.svg",
    hero: "assets/images/hero/placeholder.svg",
    productPlaceholder: "assets/images/products/placeholder.svg"
  }
};
