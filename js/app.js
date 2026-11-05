const menuGrid = document.querySelector("#menu-grid");
const categoryList = document.querySelector(".category-list");
const cartItemsContainer = document.querySelector("#cart-items");
const emptyCartMessage = document.querySelector("#empty-cart");
const cartSubtotalElement = document.querySelector("#cart-subtotal");
const cartTotalElement = document.querySelector("#cart-total");
const whatsappButton = document.querySelector(".whatsapp-button");
const orderMessageElement = document.querySelector("#order-message");
const headerCartCountElement = document.querySelector("#header-cart-count");
const mobileOrderBar = document.querySelector("#mobile-order-bar");
const mobileOrderToggle = document.querySelector("#mobile-order-toggle");
const mobileOrderClose = document.querySelector("#mobile-order-close");
const mobilePanelBackdrop = document.querySelector("#mobile-panel-backdrop");
const mobileOrderCountElement = document.querySelector("#mobile-order-count");
const mobileOrderTotalElement = document.querySelector("#mobile-order-total");
const mobilePanelLinks = document.querySelectorAll('a[href="#pedido"], a[href="#carrito"]');
const APP_CART_STORAGE_KEY = siteConfig.order.storageKey;
// Sustituir por el numero real con codigo de pais, sin +, espacios ni guiones.
const RESTAURANT_WHATSAPP_NUMBER = siteConfig.whatsapp.number;
const WHATSAPP_BASE_URL = "https://wa.me";
const PENDING_PRICES_MESSAGE = "Los precios están pendientes de confirmación. Por ahora no se pueden enviar pedidos.";
const cartItems = [];

const currencyFormatter = new Intl.NumberFormat(siteConfig.order.locale, {
  style: "currency",
  currency: siteConfig.order.currency,
});

// Convierte precios numericos a la moneda y locale configurados.
function formatPrice(price) {
  return siteConfig.order.pricesApproved === true ? currencyFormatter.format(price) : "—";
}

// Busca un producto del menu usando su id unico.
function findProductById(productId) {
  return menuItems.find((product) => product.id === productId);
}

// Busca un producto que ya esta dentro del carrito.
function findCartItemById(productId) {
  return cartItems.find((item) => item.id === productId);
}

// Cuenta todas las unidades agregadas al carrito.
function getCartItemCount() {
  return cartItems.reduce((total, item) => total + item.quantity, 0);
}

// Obtiene la imagen real asociada a un producto.
function createProductImage(product, { alt = "", lazy = false } = {}) {
  const image = document.createElement("img");
  const source = product?.imagen?.trim();
  const fallback = siteConfig.images.productPlaceholder;
  image.alt = alt;
  if (lazy) image.loading = "lazy";

  function showFallback() {
    image.dataset.imageState = "fallback";
    image.addEventListener("error", () => {
      image.dataset.imageState = "unavailable";
    }, { once: true });
    image.src = fallback;
  }

  if (source && source !== fallback) {
    image.addEventListener("error", showFallback, { once: true });
    image.src = source;
  } else {
    showFallback();
  }
  return image;
}

// Lee y limpia los datos actuales del formulario del cliente.
function getCustomerData() {
  const nameInput = document.querySelector("#customer-name");
  const deliveryTypeInput = document.querySelector('input[name="deliveryType"]:checked');
  const addressInput = document.querySelector("#customer-address");
  const notesInput = document.querySelector("#order-notes");

  return {
    name: nameInput ? nameInput.value.trim() : "",
    deliveryType: deliveryTypeInput ? deliveryTypeInput.value : "",
    address: addressInput ? addressInput.value.trim() : "",
    notes: notesInput ? notesInput.value.trim() : "",
  };
}

function findDeliveryMode(id) {
  return siteConfig.order.deliveryModes.find((mode) => mode.id === id);
}

function renderDeliveryOptions() {
  const options = document.querySelector("#delivery-options");
  const addressInput = document.querySelector("#customer-address");
  const addressLabel = document.querySelector('label[for="customer-address"]');

  function updateAddressField() {
    const requiresAddress = findDeliveryMode(getCustomerData().deliveryType)?.requiresAddress === true;
    addressLabel.hidden = !requiresAddress;
    addressInput.hidden = !requiresAddress;
    addressInput.disabled = !requiresAddress;
    addressInput.required = requiresAddress;
  }

  siteConfig.order.deliveryModes.forEach((mode) => {
    const label = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "deliveryType";
    radio.value = mode.id;
    label.append(radio, mode.label);
    options.append(label);
  });
  options.addEventListener("change", updateAddressField);
  updateAddressField();
}

// Muestra mensajes visibles y anunciables para errores o avisos del pedido.
function showOrderMessage(message, type = "error") {
  if (!orderMessageElement) {
    return;
  }

  orderMessageElement.textContent = message;
  orderMessageElement.classList.remove("is-error", "is-success");
  orderMessageElement.classList.add(type === "success" ? "is-success" : "is-error");
}

// Limpia el mensaje de validacion del pedido.
function clearOrderMessage() {
  if (!orderMessageElement) {
    return;
  }

  orderMessageElement.textContent = "";
  orderMessageElement.classList.remove("is-error", "is-success");
}

// Guarda el estado actual del carrito en el navegador.
function saveCartToStorage() {
  try {
    localStorage.setItem(APP_CART_STORAGE_KEY, JSON.stringify(cartItems));
  } catch (error) {
    console.warn("No se pudo guardar el carrito.", error);
  }
}

// Revisa que los datos guardados tengan productos validos y cantidades seguras.
function validateStoredCart(storedCart) {
  if (!Array.isArray(storedCart)) {
    return null;
  }

  const validatedItems = [];
  let hasInvalidItem = false;

  storedCart.forEach((storedItem) => {
    if (!storedItem || typeof storedItem.id !== "string") {
      hasInvalidItem = true;
      return;
    }

    const product = findProductById(storedItem.id);
    const quantity = Number(storedItem.quantity);

    if (!product || !product.disponible || !Number.isSafeInteger(quantity) || quantity <= 0) {
      hasInvalidItem = true;
      return;
    }

    const existingItem = validatedItems.find((item) => item.id === product.id);

    if (existingItem) {
      if (!Number.isSafeInteger(existingItem.quantity + quantity)) { hasInvalidItem = true; return; }
      existingItem.quantity += quantity;
      return;
    }

    validatedItems.push({
      id: product.id,
      name: product.nombre,
      price: product.precio,
      quantity,
    });
  });

  if (hasInvalidItem) {
    return null;
  }

  return validatedItems;
}

// Lee el carrito guardado; si esta corrupto, lo limpia y regresa un carrito vacio.
function loadCartFromStorage() {
  try {
    const storedCart = localStorage.getItem(APP_CART_STORAGE_KEY);

    if (!storedCart) {
      return [];
    }

    const parsedCart = JSON.parse(storedCart);
    const validatedCart = validateStoredCart(parsedCart);

    if (!validatedCart) {
      localStorage.removeItem(APP_CART_STORAGE_KEY);
      return [];
    }

    return validatedCart;
  } catch (error) {
    try { localStorage.removeItem(APP_CART_STORAGE_KEY); } catch { /* Almacenamiento bloqueado. */ }
    return [];
  }
}

// Reemplaza el carrito en memoria con datos previamente validados.
function restoreCartItems(storedItems) {
  cartItems.splice(0, cartItems.length, ...storedItems);
}

// Crea una tarjeta visual para cada producto del menu.
function createMenuCard(product) {
  const card = document.createElement("article");
  card.className = "menu-card";

  const image = document.createElement("div");
  image.className = "dish-image";

  const imageElement = createProductImage(product, { alt: product.nombre, lazy: true });
  image.append(imageElement);

  const content = document.createElement("div");
  content.className = "dish-content";

  const title = document.createElement("h3");
  title.textContent = product.nombre;

  const description = document.createElement("p");
  description.textContent = product.descripcion;

  const footer = document.createElement("div");
  footer.className = "dish-footer";

  const price = document.createElement("p");
  price.className = "price";
  price.textContent = siteConfig.order.pricesApproved === true ? formatPrice(product.precio) : "Precio pendiente";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Agregar";
  button.dataset.productId = product.id;
  button.disabled = !product.disponible;
  button.setAttribute("aria-label", `Agregar ${product.nombre}`);

  footer.append(price, button);
  content.append(title, description, footer);
  card.append(image, content);

  return card;
}

// Pinta los productos disponibles o informa cuando la categoria esta vacia.
function renderMenu(products) {
  if (!menuGrid) {
    return;
  }

  menuGrid.innerHTML = "";

  const availableProducts = products.filter((product) => product.disponible);

  if (availableProducts.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.setAttribute("role", "status");
    emptyMessage.textContent = "No hay productos disponibles en esta categoría.";
    menuGrid.append(emptyMessage);
    return;
  }

  availableProducts.forEach((product) => {
    menuGrid.append(createMenuCard(product));
  });
}

// Compara categorias sin depender de espacios accidentales en los datos.
function getProductsByCategory(category) {
  return menuItems.filter((product) => product.categoria.trim() === category.trim());
}

// Sincroniza la categoria seleccionada y muestra solo sus productos.
function selectCategory(category) {
  categoryList.querySelectorAll("button[data-category]").forEach((button) => {
    const isActive = button.dataset.category === category;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  renderMenu(getProductsByCategory(category));
}

// Atiende la seleccion con mouse o teclado mediante botones nativos.
function handleCategoryClick(event) {
  const button = event.target.closest("button[data-category]");

  if (!button || !categoryList.contains(button)) {
    return;
  }

  selectCategory(button.dataset.category);
}

// Agrega un producto nuevo al carrito o aumenta su cantidad si ya existe.
function addProductToCart(productId) {
  const product = findProductById(productId);

  if (!product || !product.disponible) {
    return;
  }

  const existingCartItem = findCartItemById(productId);

  if (existingCartItem) {
    updateCartItemQuantity(productId, 1);
    return;
  }

  cartItems.push({
    id: product.id,
    name: product.nombre,
    price: product.precio,
    quantity: 1,
  });

  saveCartToStorage();
  renderCart();
}

// Cambia la cantidad de un producto; si queda en cero, lo elimina.
function updateCartItemQuantity(productId, change) {
  const cartItem = findCartItemById(productId);

  if (!cartItem) {
    return;
  }

  const nextQuantity = cartItem.quantity + change;

  if (nextQuantity <= 0) {
    removeCartItem(productId);
    return;
  }

  if (!Number.isSafeInteger(nextQuantity)) return;
  cartItem.quantity = nextQuantity;
  saveCartToStorage();
  renderCart();
}

// Aumenta en uno la cantidad de un producto del carrito.
function increaseCartItem(productId) {
  updateCartItemQuantity(productId, 1);
}

// Disminuye en uno la cantidad de un producto del carrito.
function decreaseCartItem(productId) {
  updateCartItemQuantity(productId, -1);
}

// Elimina por completo un producto del carrito.
function removeCartItem(productId) {
  const cartItemIndex = cartItems.findIndex((item) => item.id === productId);

  if (cartItemIndex === -1) {
    return;
  }

  cartItems.splice(cartItemIndex, 1);
  saveCartToStorage();
  renderCart();
}

// Suma los subtotales de cada producto del carrito.
function calculateCartSubtotal() {
  return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
}

// Revisa que el carrito tenga productos existentes, disponibles y cantidades validas.
function validateCartForOrder() {
  const errors = [];

  if (cartItems.length === 0) {
    errors.push("Agrega al menos un producto al carrito.");
    return errors;
  }

  cartItems.forEach((item) => {
    const product = findProductById(item.id);

    if (!product || !product.disponible) {
      errors.push(`El producto "${item.name}" ya no está disponible.`);
      return;
    }

    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      errors.push(`La cantidad de "${item.name}" no es válida.`);
    }

    if (!Number.isFinite(item.price) || item.price < 0) {
      errors.push(`El precio de "${item.name}" no es válido.`);
    }
  });

  return errors;
}

// Revisa que los datos minimos del cliente esten completos.
function validateCustomerData(customerData) {
  const errors = [];

  if (!customerData.name) {
    errors.push("Escribe tu nombre para preparar el pedido.");
  }

  const deliveryMode = findDeliveryMode(customerData.deliveryType);
  if (!deliveryMode) {
    errors.push("Selecciona una modalidad de entrega.");
  } else if (deliveryMode.requiresAddress && !customerData.address) {
    errors.push("Escribe la dirección para entrega a domicilio.");
  }

  return errors;
}

// Junta las validaciones del carrito, formulario y configuracion de WhatsApp.
function validateOrder(customerData) {
  if (siteConfig.order.pricesApproved !== true) {
    return [PENDING_PRICES_MESSAGE];
  }

  const errors = [
    ...validateCartForOrder(),
    ...validateCustomerData(customerData),
  ];

  if (!isWhatsAppConfigured()) {
    errors.push("Configura y activa el WhatsApp del negocio antes de enviar pedidos.");
  }

  return errors;
}

function isWhatsAppConfigured() {
  return siteConfig.whatsapp.enabled === true && /^[1-9]\d{7,14}$/.test(RESTAURANT_WHATSAPP_NUMBER);
}

// Construye las lineas de productos que iran en el mensaje de WhatsApp.
function buildProductMessageLines() {
  return cartItems.map((item) => {
    const itemSubtotal = item.price * item.quantity;

    return `- ${item.quantity} x ${item.name} (${formatPrice(item.price)} c/u) = ${formatPrice(itemSubtotal)}`;
  });
}

// Construye el mensaje completo del pedido.
function buildWhatsAppMessage(customerData) {
  const productLines = buildProductMessageLines();
  const total = calculateCartSubtotal();
  const deliveryMode = findDeliveryMode(customerData.deliveryType);
  const messageLines = [
    siteConfig.business.name,
    "",
    "Hola, quiero hacer un pedido.",
    "",
    "Pedido:",
    ...productLines,
    "",
    `Total: ${formatPrice(total)}`,
    "",
    "Datos del cliente:",
    `Nombre: ${customerData.name}`,
    `Entrega: ${deliveryMode.label}`,
  ];

  if (deliveryMode.requiresAddress) {
    messageLines.push(`Dirección: ${customerData.address}`);
  }

  if (customerData.notes) {
    messageLines.push(`Notas: ${customerData.notes}`);
  }

  return messageLines.join("\n");
}

// Codifica el texto para usarlo de forma segura en la URL de WhatsApp.
function createWhatsAppUrl(message) {
  const encodedMessage = encodeURIComponent(message);

  return `${WHATSAPP_BASE_URL}/${RESTAURANT_WHATSAPP_NUMBER}?text=${encodedMessage}`;
}

// Activa el botón cuando el canal y los precios están aprobados y hay productos.
function updateWhatsAppButtonState() {
  if (!whatsappButton) {
    return;
  }

  whatsappButton.disabled = cartItems.length === 0
    || siteConfig.order.pricesApproved !== true || !isWhatsAppConfigured();
}

// Sincroniza contador del header y barra inferior movil con el carrito actual.
function updateOrderIndicators() {
  const itemCount = getCartItemCount();
  const subtotal = calculateCartSubtotal();
  const itemLabel = itemCount === 1 ? "1 producto" : `${itemCount} productos`;

  if (headerCartCountElement) {
    headerCartCountElement.textContent = itemCount;
  }

  if (mobileOrderCountElement) {
    mobileOrderCountElement.textContent = itemLabel;
  }

  if (mobileOrderTotalElement) {
    mobileOrderTotalElement.textContent = formatPrice(subtotal);
  }

  if (mobileOrderBar) {
    mobileOrderBar.hidden = itemCount === 0;
  }

  if (itemCount === 0) {
    closeMobileOrderPanel();
  }
}

// Crea la parte informativa de un producto en el carrito.
function createCartItemInfo(item) {
  const subtotal = item.price * item.quantity;
  const info = document.createElement("div");
  info.className = "cart-item-info";

  const title = document.createElement("h3");
  title.textContent = item.name;

  const unitPrice = document.createElement("p");
  unitPrice.textContent = `Precio unitario: ${formatPrice(item.price)}`;

  const subtotalText = document.createElement("p");
  subtotalText.className = "cart-item-subtotal";
  subtotalText.textContent = `Subtotal: ${formatPrice(subtotal)}`;

  info.append(title, unitPrice, subtotalText);

  return info;
}

// Crea una miniatura del producto para reforzar la lectura visual del pedido.
function createCartItemThumbnail(item) {
  const product = findProductById(item.id);
  const thumbnail = createProductImage(product, { lazy: true });
  thumbnail.className = "cart-item-image";

  return thumbnail;
}

// Crea un boton del carrito con accion y etiqueta accesible.
function createCartActionButton({ action, productId, label, text, className = "" }) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.dataset.action = action;
  button.dataset.productId = productId;
  button.setAttribute("aria-label", label);

  if (className) {
    button.className = className;
  }

  return button;
}

// Crea los controles de cantidad para sumar o restar unidades.
function createQuantityControls(item) {
  const quantityControls = document.createElement("div");
  quantityControls.className = "quantity-controls";

  const decreaseButton = createCartActionButton({
    action: "decrease",
    productId: item.id,
    label: `Quitar una unidad de ${item.name}`,
    text: "-",
  });

  const quantity = document.createElement("span");
  quantity.textContent = item.quantity;
  quantity.setAttribute("aria-label", `Cantidad: ${item.quantity}`);

  const increaseButton = createCartActionButton({
    action: "increase",
    productId: item.id,
    label: `Agregar una unidad de ${item.name}`,
    text: "+",
  });

  quantityControls.append(decreaseButton, quantity, increaseButton);

  return quantityControls;
}

// Crea el boton para eliminar un producto completo del carrito.
function createRemoveButton(item) {
  return createCartActionButton({
    action: "remove",
    productId: item.id,
    label: `Eliminar ${item.name} del carrito`,
    text: "Eliminar",
    className: "remove-item-button",
  });
}

// Crea el bloque visual de un producto dentro del carrito.
function createCartItemElement(item) {
  const cartItem = document.createElement("article");
  cartItem.className = "cart-item";

  const details = document.createElement("div");
  details.className = "cart-item-details";
  details.append(createCartItemThumbnail(item), createCartItemInfo(item));

  const actions = document.createElement("div");
  actions.className = "cart-item-actions";
  actions.append(createQuantityControls(item), createRemoveButton(item));

  cartItem.append(details, actions);

  return cartItem;
}

// Actualiza el mensaje vacio, la lista de productos y los totales.
function renderCart() {
  if (!cartItemsContainer || !emptyCartMessage || !cartSubtotalElement || !cartTotalElement) {
    return;
  }

  cartItemsContainer.innerHTML = "";

  if (cartItems.length === 0) {
    emptyCartMessage.classList.remove("is-hidden");
  } else {
    emptyCartMessage.classList.add("is-hidden");
    cartItems.forEach((item) => {
      cartItemsContainer.append(createCartItemElement(item));
    });
  }

  const subtotal = calculateCartSubtotal();
  cartSubtotalElement.textContent = formatPrice(subtotal);
  cartTotalElement.textContent = formatPrice(subtotal);
  updateWhatsAppButtonState();
  updateOrderIndicators();
}

// Atiende clicks en botones "Agregar" del menu usando delegacion de eventos.
function handleMenuClick(event) {
  const addButton = event.target.closest("button[data-product-id]");

  if (!addButton || !menuGrid.contains(addButton)) {
    return;
  }

  addProductToCart(addButton.dataset.productId);
}

// Atiende clicks en +, - y Eliminar dentro del carrito.
function handleCartClick(event) {
  const actionButton = event.target.closest("button[data-action]");

  if (!actionButton || !cartItemsContainer.contains(actionButton)) {
    return;
  }

  const { action, productId } = actionButton.dataset;

  switch (action) {
    case "increase":
      increaseCartItem(productId);
      break;
    case "decrease":
      decreaseCartItem(productId);
      break;
    case "remove":
      removeCartItem(productId);
      break;
    default:
      break;
  }
}

// Valida el pedido y abre WhatsApp con el mensaje preparado.
function handleWhatsAppClick() {
  const customerData = getCustomerData();
  const errors = validateOrder(customerData);

  clearOrderMessage();

  if (errors.length > 0) {
    showOrderMessage(errors[0]);
    return;
  }

  const message = buildWhatsAppMessage(customerData);
  const whatsappUrl = createWhatsAppUrl(message);

  showOrderMessage("Pedido listo. Se abrirá WhatsApp para confirmar el envío.", "success");
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}

// Abre el panel movil del pedido sin alterar el carrito.
function openMobileOrderPanel() {
  document.body.classList.add("order-panel-open");
  mobileOrderToggle?.setAttribute("aria-expanded", "true");
  mobileOrderClose?.focus();
}

// Cierra el panel movil del pedido conservando productos y formulario.
function closeMobileOrderPanel() {
  const wasOpen = document.body.classList.contains("order-panel-open");
  document.body.classList.remove("order-panel-open");
  mobileOrderToggle?.setAttribute("aria-expanded", "false");
  if (wasOpen) document.querySelector(".header-cart")?.focus();
}

// Abre el panel movil desde la barra inferior o accesos al pedido.
function handleMobilePanelRequest(event) {
  if (!window.matchMedia("(max-width: 767px)").matches) {
    return;
  }

  event.preventDefault();
  openMobileOrderPanel();
}

// Inicia la interfaz solo si existen los contenedores necesarios.
function initializeApp() {
  if (!menuGrid || !categoryList || !cartItemsContainer || !whatsappButton) {
    return;
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMobileOrderPanel();
  });
  applySiteConfig();
  renderDeliveryOptions();
  document.querySelector(".order-form").addEventListener("submit", (event) => event.preventDefault());
  if (siteConfig.order.pricesApproved !== true) {
    const priceStatus = document.querySelector("#catalog-price-status");
    priceStatus.textContent = PENDING_PRICES_MESSAGE;
    priceStatus.hidden = false;
    showOrderMessage(PENDING_PRICES_MESSAGE);
  } else if (isWhatsAppConfigured()) {
    document.querySelectorAll("[data-order-link]").forEach((link) => {
      link.textContent = "Pedir por WhatsApp";
    });
  }
  renderCategories();
  renderFeaturedProducts();
  restoreCartItems(loadCartFromStorage());
  renderCart();

  menuGrid.addEventListener("click", handleMenuClick);
  categoryList.addEventListener("click", handleCategoryClick);
  cartItemsContainer.addEventListener("click", handleCartClick);
  whatsappButton.addEventListener("click", handleWhatsAppClick);

  if (mobileOrderToggle) {
    mobileOrderToggle.addEventListener("click", openMobileOrderPanel);
  }

  if (mobileOrderClose) {
    mobileOrderClose.addEventListener("click", closeMobileOrderPanel);
  }

  if (mobilePanelBackdrop) {
    mobilePanelBackdrop.addEventListener("click", closeMobileOrderPanel);
  }

  mobilePanelLinks.forEach((link) => {
    link.addEventListener("click", handleMobilePanelRequest);
  });

  console.log("Carrito listo para agregar productos.");
}


// Vincula contenido variable sin reemplazar la estructura semántica del documento.
function applySiteConfig() {
  document.querySelectorAll("[data-config]").forEach((element) => {
    const value = element.dataset.config.split(".").reduce((value, key) => value?.[key], siteConfig);
    element.textContent = value ?? "";
  });
  document.title = `${siteConfig.business.name} | ${siteConfig.business.description}`;
  document.querySelector('meta[name="description"]').content = siteConfig.business.description;
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content = siteConfig.business.description;
  document.querySelectorAll('.brand img, .footer-content img').forEach((image) => {
    image.src = siteConfig.images.logo;
    image.alt = siteConfig.business.name;
  });
  document.querySelector('.brand').setAttribute('aria-label', `Inicio de ${siteConfig.business.shortName}`);
  document.querySelector('.story-card img').src = siteConfig.images.logo;
  if (siteConfig.images.hero) {
    const heroMedia = document.querySelector('.hero-media');
    const photo = new Image();
    photo.className = 'hero-photo';
    photo.alt = '';
    photo.fetchPriority = 'high';
    photo.addEventListener('load', () => heroMedia.append(photo), { once: true });
    photo.src = siteConfig.images.hero;
  }
  const contact = document.querySelector('#business-contact');
  ['hours', 'address', 'coverage'].forEach((key) => {
    if (!siteConfig.contact[key]) return;
    const line = document.createElement('p');
    line.textContent = siteConfig.contact[key];
    contact.append(line);
  });
  ['instagram', 'facebook'].forEach((key) => {
    try {
      const url = new URL(siteConfig.contact[key]);
      if (url.protocol !== 'https:') return;
      const link = document.createElement('a');
      link.href = url.href;
      link.textContent = key === 'instagram' ? 'Instagram' : 'Facebook';
      contact.append(link);
    } catch { /* Los enlaces vacíos u inválidos no se muestran. */ }
  });
}

function renderCategories() {
  const categories = [...new Set(menuItems.map((product) => product.categoria.trim()))];
  categoryList.replaceChildren();
  categories.forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.category = category;
    button.textContent = category;
    button.setAttribute('aria-controls', 'menu-grid');
    categoryList.append(button);
  });
  if (categories.length) selectCategory(categories[0]);
  else renderMenu([]);
}

function renderFeaturedProducts() {
  const grid = document.querySelector('#featured-grid');
  const featured = menuItems.filter((product) => product.destacado === true);
  const products = featured.length ? featured : menuItems;
  grid.replaceChildren();
  products.filter((product) => product.disponible === true).slice(0, 3).forEach((product) => {
    const card = document.createElement('article');
    card.className = 'specialty-card';
    const image = createProductImage(product, { alt: product.nombre });
    image.width = 640;
    image.height = 480;
    const content = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = product.nombre;
    const description = document.createElement('p');
    description.textContent = product.descripcion;
    const price = document.createElement('strong');
    price.textContent = formatPrice(product.precio);
    content.append(title, description, price);
    card.append(image, content);
    grid.append(card);
  });
}

document.addEventListener("DOMContentLoaded", initializeApp);
