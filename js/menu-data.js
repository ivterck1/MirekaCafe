// Generado desde Excel. Categorías y productos ordenados; destacado selecciona especialidades.
const menuItems = [
  {
    "id": "cafe-caliente-americano",
    "nombre": "Americano",
    "descripcion": "Café americano tradicional",
    "precio": 2,
    "categoria": "Café caliente",
    "imagen": "assets/images/products/cafe-caliente-americano.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "cafe-caliente-espresso",
    "nombre": "Espresso",
    "descripcion": "Café espresso concentrado",
    "precio": 3,
    "categoria": "Café caliente",
    "imagen": "assets/images/products/cafe-caliente-espresso.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "cafe-caliente-chocolate-caliente",
    "nombre": "Chocolate caliente",
    "descripcion": "Chocolate caliente tradicional",
    "precio": 4,
    "categoria": "Café caliente",
    "imagen": "assets/images/products/cafe-caliente-chocolate-caliente.webp",
    "disponible": true,
    "destacado": true
  },
  {
    "id": "cafe-caliente-capuchino-tradicional",
    "nombre": "Capuchino tradicional",
    "descripcion": "Capuchino clásico",
    "precio": 5,
    "categoria": "Café caliente",
    "imagen": "assets/images/products/cafe-caliente-capuchino-tradicional.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "capuchinos-saborizados-crema-irlandesa-10-oz",
    "nombre": "Crema Irlandesa 10 oz",
    "descripcion": "Capuchino sabor crema irlandesa",
    "precio": 6,
    "categoria": "Capuchinos Saborizados",
    "imagen": "assets/images/products/capuchinos-saborizados-crema-irlandesa.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "capuchinos-saborizados-crema-irlandesa-16-oz",
    "nombre": "Crema Irlandesa 16 oz",
    "descripcion": "Capuchino sabor crema irlandesa",
    "precio": 7,
    "categoria": "Capuchinos Saborizados",
    "imagen": "assets/images/products/capuchinos-saborizados-crema-irlandesa.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "capuchinos-saborizados-caramelo-10-oz",
    "nombre": "Caramelo 10 oz",
    "descripcion": "Capuchino sabor caramelo",
    "precio": 8,
    "categoria": "Capuchinos Saborizados",
    "imagen": "assets/images/products/capuchinos-saborizados-caramelo.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "capuchinos-saborizados-caramelo-16-oz",
    "nombre": "Caramelo 16 oz",
    "descripcion": "Capuchino sabor caramelo",
    "precio": 9,
    "categoria": "Capuchinos Saborizados",
    "imagen": "assets/images/products/capuchinos-saborizados-caramelo.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "capuchinos-saborizados-chocolate-10-oz",
    "nombre": "Chocolate 10 oz",
    "descripcion": "Capuchino sabor chocolate",
    "precio": 10,
    "categoria": "Capuchinos Saborizados",
    "imagen": "assets/images/products/capuchinos-saborizados-chocolate.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "capuchinos-saborizados-chocolate-16-oz",
    "nombre": "Chocolate 16 oz",
    "descripcion": "Capuchino sabor chocolate",
    "precio": 11,
    "categoria": "Capuchinos Saborizados",
    "imagen": "assets/images/products/capuchinos-saborizados-chocolate.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "capuchinos-saborizados-avellana-10-oz",
    "nombre": "Avellana 10 oz",
    "descripcion": "Capuchino sabor avellana",
    "precio": 12,
    "categoria": "Capuchinos Saborizados",
    "imagen": "assets/images/products/capuchinos-saborizados-avellana.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "capuchinos-saborizados-avellana-16-oz",
    "nombre": "Avellana 16 oz",
    "descripcion": "Capuchino sabor avellana",
    "precio": 13,
    "categoria": "Capuchinos Saborizados",
    "imagen": "assets/images/products/capuchinos-saborizados-avellana.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "capuchinos-saborizados-amaretto-10-oz",
    "nombre": "Amaretto 10 oz",
    "descripcion": "Capuchino sabor amaretto",
    "precio": 14,
    "categoria": "Capuchinos Saborizados",
    "imagen": "assets/images/products/capuchinos-saborizados-amaretto.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "capuchinos-saborizados-amaretto-16-oz",
    "nombre": "Amaretto 16 oz",
    "descripcion": "Capuchino sabor amaretto",
    "precio": 15,
    "categoria": "Capuchinos Saborizados",
    "imagen": "assets/images/products/capuchinos-saborizados-amaretto.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "capuchinos-saborizados-vainilla-10-oz",
    "nombre": "Vainilla 10 oz",
    "descripcion": "Capuchino sabor vainilla",
    "precio": 16,
    "categoria": "Capuchinos Saborizados",
    "imagen": "assets/images/products/capuchinos-saborizados-vainilla.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "capuchinos-saborizados-vainilla-16-oz",
    "nombre": "Vainilla 16 oz",
    "descripcion": "Capuchino sabor vainilla",
    "precio": 17,
    "categoria": "Capuchinos Saborizados",
    "imagen": "assets/images/products/capuchinos-saborizados-vainilla.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "capuchinos-saborizados-cajeta-10-oz",
    "nombre": "Cajeta 10 oz",
    "descripcion": "Capuchino sabor cajeta",
    "precio": 18,
    "categoria": "Capuchinos Saborizados",
    "imagen": "assets/images/products/capuchinos-saborizados-cajeta.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "capuchinos-saborizados-cajeta-16-oz",
    "nombre": "Cajeta 16 oz",
    "descripcion": "Capuchino sabor cajeta",
    "precio": 19,
    "categoria": "Capuchinos Saborizados",
    "imagen": "assets/images/products/capuchinos-saborizados-cajeta.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "lattes-frios-tradicional",
    "nombre": "Tradicional",
    "descripcion": "Latte frío en presentación de 16oz",
    "precio": 20,
    "categoria": "Lattes fríos",
    "imagen": "assets/images/products/lattes-frios-tradicional.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "lattes-frios-crema-irlandesa",
    "nombre": "Crema irlandesa",
    "descripcion": "Latte frío sabor crema irlandesa (16oz)",
    "precio": 21,
    "categoria": "Lattes fríos",
    "imagen": "assets/images/products/lattes-frios-crema-irlandesa.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "lattes-frios-caramelo",
    "nombre": "Caramelo",
    "descripcion": "Latte frío sabor caramelo (16oz)",
    "precio": 22,
    "categoria": "Lattes fríos",
    "imagen": "assets/images/products/lattes-frios-caramelo.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "lattes-frios-chocolate",
    "nombre": "Chocolate",
    "descripcion": "Latte frío sabor chocolate (16oz)",
    "precio": 23,
    "categoria": "Lattes fríos",
    "imagen": "assets/images/products/lattes-frios-chocolate.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "lattes-frios-avellana",
    "nombre": "Avellana",
    "descripcion": "Latte frío sabor avellana (16oz)",
    "precio": 24,
    "categoria": "Lattes fríos",
    "imagen": "assets/images/products/lattes-frios-avellana.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "lattes-frios-amaretto",
    "nombre": "Amaretto",
    "descripcion": "Latte frío sabor amaretto (16oz)",
    "precio": 25,
    "categoria": "Lattes fríos",
    "imagen": "assets/images/products/lattes-frios-amaretto.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "lattes-frios-vainilla",
    "nombre": "Vainilla",
    "descripcion": "Latte frío sabor vainilla (16oz)",
    "precio": 26,
    "categoria": "Lattes fríos",
    "imagen": "assets/images/products/lattes-frios-vainilla.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "lattes-frios-cajeta",
    "nombre": "Cajeta",
    "descripcion": "Latte frío sabor cajeta (16oz)",
    "precio": 27,
    "categoria": "Lattes fríos",
    "imagen": "assets/images/products/lattes-frios-cajeta.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "lattes-frios-lechera",
    "nombre": "Lechera",
    "descripcion": "Latte frío sabor lechera (16oz)",
    "precio": 28,
    "categoria": "Lattes fríos",
    "imagen": "assets/images/products/lattes-frios-lechera.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "sodas-italianas-mora",
    "nombre": "Mora",
    "descripcion": "Soda italiana sabor mora",
    "precio": 29,
    "categoria": "Sodas italianas",
    "imagen": "assets/images/products/sodas-italianas-mora.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "sodas-italianas-frutos-rojos",
    "nombre": "Frutos rojos",
    "descripcion": "Soda italiana sabor frutos rojos",
    "precio": 30,
    "categoria": "Sodas italianas",
    "imagen": "assets/images/products/sodas-italianas-frutos-rojos.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "sodas-italianas-frambuesa",
    "nombre": "Frambuesa",
    "descripcion": "Soda italiana sabor frambuesa",
    "precio": 31,
    "categoria": "Sodas italianas",
    "imagen": "assets/images/products/sodas-italianas-frambuesa.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "frappes-cafe",
    "nombre": "Café",
    "descripcion": "Frappé sabor café",
    "precio": 32,
    "categoria": "Frappés",
    "imagen": "assets/images/products/frappes-cafe.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "frappes-fresa",
    "nombre": "Fresa",
    "descripcion": "Frappé sabor fresa",
    "precio": 33,
    "categoria": "Frappés",
    "imagen": "assets/images/products/frappes-fresa.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "frappes-chocolate",
    "nombre": "Chocolate",
    "descripcion": "Frappé sabor chocolate",
    "precio": 34,
    "categoria": "Frappés",
    "imagen": "assets/images/products/frappes-chocolate.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "frappes-nutella",
    "nombre": "Nutella",
    "descripcion": "Frappé sabor Nutella",
    "precio": 35,
    "categoria": "Frappés",
    "imagen": "assets/images/products/frappes-nutella.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "frappes-oreo",
    "nombre": "Oreo",
    "descripcion": "Frappé sabor Oreo",
    "precio": 36,
    "categoria": "Frappés",
    "imagen": "assets/images/products/frappes-oreo.webp",
    "disponible": true,
    "destacado": true
  },
  {
    "id": "frappes-crema-irlandesa",
    "nombre": "Crema irlandesa",
    "descripcion": "Frappé sabor crema irlandesa",
    "precio": 37,
    "categoria": "Frappés",
    "imagen": "assets/images/products/frappes-crema-irlandesa.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "frappes-caramelo",
    "nombre": "Caramelo",
    "descripcion": "Frappé sabor caramelo",
    "precio": 38,
    "categoria": "Frappés",
    "imagen": "assets/images/products/frappes-caramelo.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "frappes-avellana",
    "nombre": "Avellana",
    "descripcion": "Frappé sabor avellana",
    "precio": 39,
    "categoria": "Frappés",
    "imagen": "assets/images/products/frappes-avellana.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "frappes-amaretto",
    "nombre": "Amaretto",
    "descripcion": "Frappé sabor amaretto",
    "precio": 40,
    "categoria": "Frappés",
    "imagen": "assets/images/products/frappes-amaretto.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "frappes-vainilla",
    "nombre": "Vainilla",
    "descripcion": "Frappé sabor vainilla",
    "precio": 41,
    "categoria": "Frappés",
    "imagen": "assets/images/products/frappes-vainilla.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "frappes-frutos-rojos",
    "nombre": "Frutos rojos",
    "descripcion": "Frappé sabor frutos rojos",
    "precio": 42,
    "categoria": "Frappés",
    "imagen": "assets/images/products/frappes-frutos-rojos.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "frappes-matcha",
    "nombre": "Matcha",
    "descripcion": "Frappé sabor matcha",
    "precio": 43,
    "categoria": "Frappés",
    "imagen": "assets/images/products/frappes-matcha.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "frappes-taro",
    "nombre": "Taro",
    "descripcion": "Frappé sabor taro",
    "precio": 44,
    "categoria": "Frappés",
    "imagen": "assets/images/products/frappes-taro.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "tes-e-infusiones-frutos-rojos",
    "nombre": "Frutos rojos",
    "descripcion": "Té / infusión sabor frutos rojos (16oz)",
    "precio": 45,
    "categoria": "Tés e infusiones",
    "imagen": "assets/images/products/tes-e-infusiones-frutos-rojos.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "tes-e-infusiones-canela",
    "nombre": "Canela",
    "descripcion": "Té / infusión sabor canela (16oz)",
    "precio": 46,
    "categoria": "Tés e infusiones",
    "imagen": "assets/images/products/tes-e-infusiones-canela.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "tes-e-infusiones-manzanilla",
    "nombre": "Manzanilla",
    "descripcion": "Té / infusión de manzanilla (16oz)",
    "precio": 47,
    "categoria": "Tés e infusiones",
    "imagen": "assets/images/products/tes-e-infusiones-manzanilla.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "tes-e-infusiones-hierbabuena",
    "nombre": "Hierbabuena",
    "descripcion": "Té / infusión de hierbabuena (16oz)",
    "precio": 48,
    "categoria": "Tés e infusiones",
    "imagen": "assets/images/products/tes-e-infusiones-hierbabuena.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "smoothies-frutos-rojos",
    "nombre": "Frutos rojos",
    "descripcion": "Smoothie sabor frutos rojos (16oz)",
    "precio": 49,
    "categoria": "Smoothies",
    "imagen": "assets/images/products/smoothies-frutos-rojos.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "smoothies-fresa",
    "nombre": "Fresa",
    "descripcion": "Smoothie sabor fresa (16oz)",
    "precio": 50,
    "categoria": "Smoothies",
    "imagen": "assets/images/products/smoothies-fresa.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "smoothies-fresa-con-platano",
    "nombre": "Fresa con plátano",
    "descripcion": "Smoothie sabor fresa con plátano (16oz)",
    "precio": 51,
    "categoria": "Smoothies",
    "imagen": "assets/images/products/smoothies-fresa-con-platano.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "bebidas-preparadas-chamoyadas",
    "nombre": "Chamoyadas",
    "descripcion": "Chamoyada preparada (16oz)",
    "precio": 52,
    "categoria": "Bebidas preparadas",
    "imagen": "assets/images/products/bebidas-preparadas-chamoyadas.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "bebidas-preparadas-azulitos",
    "nombre": "Azulitos",
    "descripcion": "Azulito preparado (1 litro)",
    "precio": 53,
    "categoria": "Bebidas preparadas",
    "imagen": "assets/images/products/bebidas-preparadas-azulitos.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "bebidas-preparadas-micheladas",
    "nombre": "Micheladas",
    "descripcion": "Michelada preparada (1 litro)",
    "precio": 54,
    "categoria": "Bebidas preparadas",
    "imagen": "assets/images/products/bebidas-preparadas-micheladas.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "chapatas-sandwiches-y-desayunos-chapata",
    "nombre": "Chapata",
    "descripcion": "De jamón y 3 quesos.",
    "precio": 55,
    "categoria": "Chapatas, Sándwiches y desayunos",
    "imagen": "assets/images/products/chapatas-sandwiches-y-desayunos-chapata.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "chapatas-sandwiches-y-desayunos-cuernito",
    "nombre": "Cuernito",
    "descripcion": "De jamón, quesos y aderezo.",
    "precio": 56,
    "categoria": "Chapatas, Sándwiches y desayunos",
    "imagen": "assets/images/products/chapatas-sandwiches-y-desayunos-cuernito.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "chapatas-sandwiches-y-desayunos-mini-molletes",
    "nombre": "Mini molletes",
    "descripcion": "Pan doradito con frijoles, queso gratinado y pico de gallo.",
    "precio": 57,
    "categoria": "Chapatas, Sándwiches y desayunos",
    "imagen": "assets/images/products/chapatas-sandwiches-y-desayunos-mini-molletes.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "chapatas-sandwiches-y-desayunos-mini-molletes-mireka",
    "nombre": "Mini molletes Mireka",
    "descripcion": "Acompañados de frijoles, jamón, longaniza, queso gratinado y pico de gallo.",
    "precio": 58,
    "categoria": "Chapatas, Sándwiches y desayunos",
    "imagen": "assets/images/products/chapatas-sandwiches-y-desayunos-mini-molletes-mireka.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "chapatas-sandwiches-y-desayunos-sincronizadas",
    "nombre": "Sincronizadas",
    "descripcion": "Tortillas de harina doraditas, rellenas de jamón y queso fundido.",
    "precio": 59,
    "categoria": "Chapatas, Sándwiches y desayunos",
    "imagen": "assets/images/products/chapatas-sandwiches-y-desayunos-sincronizadas.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "chapatas-sandwiches-y-desayunos-chilaquiles-suizos-mireka",
    "nombre": "Chilaquiles Suizos Mireka",
    "descripcion": "Totopos bañados en salsa verde cremosa, con queso gratinado, pollo y crema.",
    "precio": 60,
    "categoria": "Chapatas, Sándwiches y desayunos",
    "imagen": "assets/images/products/chapatas-sandwiches-y-desayunos-chilaquiles-suizos-mireka.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "crepas-saladas-y-dulces-crepa-jamon-y-tres-quesos",
    "nombre": "Crepa jamón y tres quesos",
    "descripcion": "Deliciosa crepa rellena de jamón y una combinación de tres quesos fundidos.",
    "precio": 61,
    "categoria": "Crepas saladas y dulces",
    "imagen": "assets/images/products/crepas-saladas-y-dulces-crepa-jamon-y-tres-quesos.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "crepas-saladas-y-dulces-crepa-especial-mireka",
    "nombre": "Crepa especial Mireka",
    "descripcion": "Nuestra combinación especial de tres quesos, pepperoni, jamón y aderezo de la casa.",
    "precio": 62,
    "categoria": "Crepas saladas y dulces",
    "imagen": "assets/images/products/crepas-saladas-y-dulces-crepa-especial-mireka.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "crepas-saladas-y-dulces-crepa-dulce-nutella",
    "nombre": "Crepa dulce - Nutella",
    "descripcion": "Crepa dulce rellena de Nutella.",
    "precio": 63,
    "categoria": "Crepas saladas y dulces",
    "imagen": "assets/images/products/crepas-saladas-y-dulces-crepa-dulce-nutella.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "crepas-saladas-y-dulces-crepa-dulce-cajeta",
    "nombre": "Crepa dulce - Cajeta",
    "descripcion": "Crepa dulce rellena de Cajeta.",
    "precio": 64,
    "categoria": "Crepas saladas y dulces",
    "imagen": "assets/images/products/crepas-saladas-y-dulces-crepa-dulce-cajeta.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "crepas-saladas-y-dulces-crepa-dulce-chocolate",
    "nombre": "Crepa dulce - Chocolate",
    "descripcion": "Crepa dulce rellena de Chocolate.",
    "precio": 65,
    "categoria": "Crepas saladas y dulces",
    "imagen": "assets/images/products/crepas-saladas-y-dulces-crepa-dulce-chocolate.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "crepas-saladas-y-dulces-crepa-dulce-zarzamora",
    "nombre": "Crepa dulce - Zarzamora",
    "descripcion": "Crepa dulce rellena de Zarzamora.",
    "precio": 66,
    "categoria": "Crepas saladas y dulces",
    "imagen": "assets/images/products/crepas-saladas-y-dulces-crepa-dulce-zarzamora.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "crepas-saladas-y-dulces-crepa-dulce-fresa",
    "nombre": "Crepa dulce - Fresa",
    "descripcion": "Crepa dulce rellena de Fresa.",
    "precio": 67,
    "categoria": "Crepas saladas y dulces",
    "imagen": "assets/images/products/crepas-saladas-y-dulces-crepa-dulce-fresa.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "crepas-saladas-y-dulces-crepa-dulce-caramelo",
    "nombre": "Crepa dulce - Caramelo",
    "descripcion": "Crepa dulce rellena de Caramelo.",
    "precio": 68,
    "categoria": "Crepas saladas y dulces",
    "imagen": "assets/images/products/crepas-saladas-y-dulces-crepa-dulce-caramelo.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "crepas-saladas-y-dulces-crepa-dulce-lechera",
    "nombre": "Crepa dulce - Lechera",
    "descripcion": "Crepa dulce rellena de Lechera.",
    "precio": 69,
    "categoria": "Crepas saladas y dulces",
    "imagen": "assets/images/products/crepas-saladas-y-dulces-crepa-dulce-lechera.webp",
    "disponible": true,
    "destacado": true
  },
  {
    "id": "personaliza-tu-crepa-rellenos-adicionales",
    "nombre": "Rellenos adicionales",
    "descripcion": "Fruta y queso philadelphia.",
    "precio": 70,
    "categoria": "Personaliza tu crepa",
    "imagen": "assets/images/products/personaliza-tu-crepa-rellenos-adicionales.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "personaliza-tu-crepa-toppings",
    "nombre": "Toppings",
    "descripcion": "Nuez, pasas, chispas de chocolate, granillo de colores, galleta oreo, chocoretas, bombones y fruta fresca de temporada.",
    "precio": 71,
    "categoria": "Personaliza tu crepa",
    "imagen": "assets/images/products/personaliza-tu-crepa-toppings.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "waffles-dulces-waffle-dulce",
    "nombre": "Waffle dulce",
    "descripcion": "Salsas/Sabores: Nutella, cajeta, chocolate, zarzamora, fresa, caramelo y lechera. Rellenos: Fruta o queso Philadelphia. Toppings: Nuez, pasas, chispas de chocolate, granillo de colores, chocoretas y bombones.",
    "precio": 72,
    "categoria": "Waffles dulces",
    "imagen": "assets/images/products/waffles-dulces-waffle-dulce.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "conos-mireka-cono-salchipapero",
    "nombre": "Cono Salchipapero",
    "descripcion": "Papas a la francesa con salchichas y salsas al gusto.",
    "precio": 73,
    "categoria": "Conos Mireka",
    "imagen": "assets/images/products/conos-mireka-cono-salchipapero.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "conos-mireka-cono-boneless",
    "nombre": "Cono Boneless",
    "descripcion": "Papas crujientes con boneless, acompañados de tu salsa favorita.",
    "precio": 74,
    "categoria": "Conos Mireka",
    "imagen": "assets/images/products/conos-mireka-cono-boneless.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "conos-mireka-cono-quesero",
    "nombre": "Cono Quesero",
    "descripcion": "Papas a la francesa con dedos de queso y aderezos.",
    "precio": 75,
    "categoria": "Conos Mireka",
    "imagen": "assets/images/products/conos-mireka-cono-quesero.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "conos-mireka-cono-mireka",
    "nombre": "Cono Mireka",
    "descripcion": "Papas crujientes con boneless, dedos de queso y aderezos (Salsas a elegir).",
    "precio": 76,
    "categoria": "Conos Mireka",
    "imagen": "assets/images/products/conos-mireka-cono-mireka.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "salsas-salsas-clasicas",
    "nombre": "Salsas clásicas",
    "descripcion": "Catsup, Mayonesa con chipotle, Salsas negras.",
    "precio": 77,
    "categoria": "Salsas",
    "imagen": "assets/images/products/salsas-salsas-clasicas.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "salsas-salsas-cremosas",
    "nombre": "Salsas cremosas",
    "descripcion": "Queso amarillo caliente, BBQ, Crema de chipotle picante.",
    "precio": 78,
    "categoria": "Salsas",
    "imagen": "assets/images/products/salsas-salsas-cremosas.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "salsas-salsas-especiales",
    "nombre": "Salsas especiales",
    "descripcion": "Mango habanero dulce y picoso, Búfalo, Salsa macha picosita.",
    "precio": 79,
    "categoria": "Salsas",
    "imagen": "assets/images/products/salsas-salsas-especiales.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "combos-antojo-mireka",
    "nombre": "Antojo Mireka",
    "descripcion": "1 bebida + 1 antojo dulce. Latte frío o frappé + Crepa, waffle o mini hot cakes. Para quien quiere consentirse por la tarde.",
    "precio": 80,
    "categoria": "Combos",
    "imagen": "assets/images/products/combos-antojo-mireka.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "combos-plan-de-dos",
    "nombre": "Plan de Dos",
    "descripcion": "2 bebidas + 1 postre para compartir. Dos lattes, Capuchinos o Frappes + Un waffle para compartir. Perfecto para parejas, hermanas o amigas.",
    "precio": 81,
    "categoria": "Combos",
    "imagen": "assets/images/products/combos-plan-de-dos.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "combos-antojo-salado",
    "nombre": "Antojo Salado",
    "descripcion": "1 snack + 1 bebida. Papas, salchichas o boneless + 1 Soda italiana o bebida fría. Para quienes buscan algo salado y llenador.",
    "precio": 82,
    "categoria": "Combos",
    "imagen": "assets/images/products/combos-antojo-salado.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "combos-delicia-mireka",
    "nombre": "Delicia Mireka",
    "descripcion": "1 chapata, cuernito o club sándwich + 1 bebida (Café americano, té o soda italiana). Ideal para una comida rápida o una pausa en el día.",
    "precio": 83,
    "categoria": "Combos",
    "imagen": "assets/images/products/combos-delicia-mireka.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "combos-desayuno-mireka",
    "nombre": "Desayuno Mireka",
    "descripcion": "1 desayuno + 1 bebida + fruta. Fruta, Chilaquiles suizos con o sin pollo + Café americano o chocolate caliente. Ideal para un rico desayuno completo.",
    "precio": 84,
    "categoria": "Combos",
    "imagen": "assets/images/products/combos-desayuno-mireka.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "combos-duo-de-antojos",
    "nombre": "Duo de antojos",
    "descripcion": "2 bebidas + 2 alimentos. Dos frappés o lattes + Dos crepas o mini hot cake para dos personas. Ideal para antojos dulces.",
    "precio": 85,
    "categoria": "Combos",
    "imagen": "assets/images/products/combos-duo-de-antojos.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "combos-mix-snacks",
    "nombre": "Mix snacks",
    "descripcion": "Papas a la francesa + boneless + dedos de queso + 2 chamoyadas. Un combo ideal para compartir con tu persona favorita o familia.",
    "precio": 223,
    "categoria": "Combos",
    "imagen": "assets/images/products/combos-mix-snacks.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "snacks-otros-mini-hot-cake-mireka",
    "nombre": "Mini hot cake Mireka",
    "descripcion": "Una opción dulce y personalizable para disfrutar en cualquier momento, con las mismas combinaciones de sabores, frutas y toppings.",
    "precio": 87,
    "categoria": "Snacks & Otros",
    "imagen": "assets/images/products/snacks-otros-mini-hot-cake-mireka.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "snacks-otros-boneless",
    "nombre": "Boneless",
    "descripcion": "Trozos de pollo crujientes, acompañados de tu salsa favorita.",
    "precio": 100,
    "categoria": "Snacks & Otros",
    "imagen": "assets/images/products/snacks-otros-boneless.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "snacks-otros-papas-a-la-francesa",
    "nombre": "Papas a la francesa",
    "descripcion": "Papas doraditas y crujientes, ideales para acompañar cualquier antojo.",
    "precio": 50,
    "categoria": "Snacks & Otros",
    "imagen": "assets/images/products/snacks-otros-papas-a-la-francesa.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "snacks-otros-salchipapas",
    "nombre": "Salchipapas",
    "descripcion": "La combinación de papas a la francesa y salchichas con salsas al gusto.",
    "precio": 90,
    "categoria": "Snacks & Otros",
    "imagen": "assets/images/products/snacks-otros-salchipapas.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "snacks-otros-dedos-de-queso",
    "nombre": "Dedos de queso",
    "descripcion": "Queso empanizado y crujiente, perfecto para acompañar con tus aderezos favoritos.",
    "precio": 91,
    "categoria": "Snacks & Otros",
    "imagen": "assets/images/products/snacks-otros-dedos-de-queso.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "snacks-otros-gomitas-enchiladas",
    "nombre": "Gomitas enchiladas",
    "descripcion": "Un antojo dulce, acidito y picosito para complementar tus bebidas.",
    "precio": 92,
    "categoria": "Snacks & Otros",
    "imagen": "assets/images/products/snacks-otros-gomitas-enchiladas.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "postres-fruta-con-crema",
    "nombre": "Fruta con crema",
    "descripcion": "Fruta fresca servida con crema especial.",
    "precio": 93,
    "categoria": "Postres",
    "imagen": "assets/images/products/postres-fruta-con-crema.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "postres-fresas-con-crema",
    "nombre": "Fresas con crema",
    "descripcion": "Fresas frescas servidas con crema especial.",
    "precio": 94,
    "categoria": "Postres",
    "imagen": "assets/images/products/postres-fresas-con-crema.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "postres-duraznos-con-crema",
    "nombre": "Duraznos con crema",
    "descripcion": "Duraznos en almíbar servidos con crema especial.",
    "precio": 50,
    "categoria": "Postres",
    "imagen": "assets/images/products/postres-duraznos-con-crema.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "postres-pay-de-limon",
    "nombre": "Pay de limón",
    "descripcion": "Rebanada de pay de limón.",
    "precio": 96,
    "categoria": "Postres",
    "imagen": "assets/images/products/postres-pay-de-limon.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "postres-pay-de-queso",
    "nombre": "Pay de queso",
    "descripcion": "Rebanada de pay de queso.",
    "precio": 97,
    "categoria": "Postres",
    "imagen": "assets/images/products/postres-pay-de-queso.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "postres-arroz-con-leche",
    "nombre": "Arroz con leche",
    "descripcion": "Arroz con leche tradicional.",
    "precio": 98,
    "categoria": "Postres",
    "imagen": "assets/images/products/postres-arroz-con-leche.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "postres-pan-dulce",
    "nombre": "Pan dulce",
    "descripcion": "Selección de pan dulce de la casa.",
    "precio": 15,
    "categoria": "Postres",
    "imagen": "assets/images/products/postres-pan-dulce.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "postres-conchas-rellenas",
    "nombre": "Conchas rellenas",
    "descripcion": "Conchas rellenas de crema batida y fruta.",
    "precio": 25,
    "categoria": "Postres",
    "imagen": "assets/images/products/postres-conchas-rellenas.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "postres-donas-de-chocolate-y-azucar",
    "nombre": "Donas de chocolate y azúcar",
    "descripcion": "Donas preparadas con cobertura de chocolate o azúcar.",
    "precio": 101,
    "categoria": "Postres",
    "imagen": "assets/images/products/postres-donas-de-chocolate-y-azucar.webp",
    "disponible": true,
    "destacado": false
  },
  {
    "id": "especiales-pozole-mireka-especial-de-la-semana",
    "nombre": "Pozole Mireka (Especial de la semana)",
    "descripcion": "Disponible viernes y sábado. Pozole rojo de pollo o cerdo con sabor casero de la receta de la casa.",
    "precio": 177,
    "categoria": "Especiales",
    "imagen": "assets/images/products/especiales-pozole-mireka-especial-de-la-semana.webp",
    "disponible": true,
    "destacado": false
  }
];
