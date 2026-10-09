// ==========================================
// VAULT
// CART.JS - Carrito y finalización de compra
// ==========================================

const cartOverlay = document.getElementById("cartOverlay");
const cartIcon = document.getElementById("cartIcon");
const closeCartBtn = document.getElementById("closeCart");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const cartBadge = document.getElementById("cartBadge");
const checkoutBtn = document.getElementById("checkoutBtn");
const clearCartBtn = document.getElementById("clearCart");

const checkoutOverlay = document.getElementById("checkoutOverlay");
const checkoutStep1 = document.getElementById("checkoutStep1");
const checkoutStep2 = document.getElementById("checkoutStep2");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutError = document.getElementById("checkoutError");
const orderSummary = document.getElementById("orderSummary");
const orderTotal = document.getElementById("orderTotal");

const CART_KEY = "vault_cart";

let cart = loadCart();
let lastFocus = null;

// ================= UTILIDADES =================

const money = (n) => "$" + Number(n).toLocaleString("en-US");

function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function loadCart() {
    try {
        const saved = JSON.parse(localStorage.getItem(CART_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function saveCart() {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
        /* el carrito sigue funcionando en memoria */
    }
}

const cartCount = () => cart.reduce((sum, item) => sum + item.quantity, 0);
const cartSum = () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

// ================= ABRIR / CERRAR =================

function openOverlay(overlay) {
    lastFocus = document.activeElement;
    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
}

function closeOverlay(overlay) {
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");

    if (!document.querySelector(".cart-overlay.active, .modal-overlay.active")) {
        document.body.classList.remove("no-scroll");
    }

    if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function openCart() {
    openOverlay(cartOverlay);
    closeCartBtn.focus();
}

const closeCart = () => closeOverlay(cartOverlay);

cartIcon.addEventListener("click", openCart);
closeCartBtn.addEventListener("click", closeCart);

cartOverlay.addEventListener("click", (e) => {
    if (e.target === cartOverlay) closeCart();
});

document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;

    if (checkoutOverlay.classList.contains("active")) {
        closeOverlay(checkoutOverlay);
    } else if (cartOverlay.classList.contains("active")) {
        closeCart();
    }
});

// ================= AGREGAR =================

document.querySelectorAll(".add-cart").forEach((button) => {
    button.addEventListener("click", () => {
        const card = button.closest(".card");
        const data = card.dataset;
        const stock = Number(data.stock);

        const existing = cart.find((item) => item.id === data.id);

        if (existing) {
            if (existing.quantity >= stock) {
                showToast(`Solo hay ${stock} unidades de ${data.name}.`);
                return;
            }
            existing.quantity++;
        } else {
            cart.push({
                id: data.id,
                name: data.name,
                price: Number(data.price),
                image: data.image,
                size: data.size,
                stock: stock,
                quantity: 1
            });
        }

        updateCart();
        showToast(`${data.name} se agregó al carrito.`);

        cartBadge.classList.remove("bump");
        void cartBadge.offsetWidth;
        cartBadge.classList.add("bump");
    });
});

// ================= DIBUJAR CARRITO =================

function updateCart() {
    saveCart();

    if (cart.length === 0) {
        cartItemsEl.innerHTML = "<p class='empty-cart'>Tu carrito está vacío.</p>";
    } else {
        cartItemsEl.innerHTML = cart.map((item) => `
            <div class="cart-product">
                <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}">

                <div>
                    <h4>${escapeHTML(item.name)}</h4>
                    <p class="unit">Talla ${escapeHTML(item.size)} · ${money(item.price)} c/u</p>

                    <div class="cart-controls">
                        <button type="button" data-action="decrease" data-id="${escapeHTML(item.id)}"
                            aria-label="Quitar una unidad">−</button>
                        <span>${item.quantity}</span>
                        <button type="button" data-action="increase" data-id="${escapeHTML(item.id)}"
                            aria-label="Agregar una unidad"
                            ${item.quantity >= item.stock ? "disabled" : ""}>+</button>
                    </div>
                </div>

                <div>
                    <div class="line-total">${money(item.price * item.quantity)}</div>
                    <button type="button" class="remove-btn" data-action="remove"
                        data-id="${escapeHTML(item.id)}" aria-label="Eliminar ${escapeHTML(item.name)}">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
            </div>
        `).join("");
    }

    const count = cartCount();

    cartTotalEl.textContent = money(cartSum());
    cartBadge.textContent = count;
    cartBadge.hidden = count === 0;
    checkoutBtn.disabled = count === 0;
    clearCartBtn.hidden = count === 0;
}

// Controles del carrito (delegación de eventos, sin onclick en el HTML)
cartItemsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn || btn.disabled) return;

    const item = cart.find((i) => i.id === btn.dataset.id);
    if (!item) return;

    if (btn.dataset.action === "increase" && item.quantity < item.stock) {
        item.quantity++;
    } else if (btn.dataset.action === "decrease") {
        item.quantity--;
        if (item.quantity <= 0) cart = cart.filter((i) => i !== item);
    } else if (btn.dataset.action === "remove") {
        cart = cart.filter((i) => i !== item);
    }

    updateCart();
});

clearCartBtn.addEventListener("click", () => {
    cart = [];
    updateCart();
});

// ================= FINALIZAR COMPRA =================

function openCheckout() {
    if (cart.length === 0) return;

    orderSummary.innerHTML = cart.map((item) => `
        <li>
            <span>${escapeHTML(item.name)} <span class="qty">× ${item.quantity}</span></span>
            <span>${money(item.price * item.quantity)}</span>
        </li>
    `).join("");

    orderTotal.textContent = money(cartSum());

    checkoutStep1.hidden = false;
    checkoutStep2.hidden = true;
    checkoutError.textContent = "";
    checkoutForm.querySelectorAll("input").forEach((i) => i.classList.remove("invalid"));

    // El carrito queda debajo; al cerrar el pedido se vuelve al botón original
    const previous = lastFocus;
    openOverlay(checkoutOverlay);
    lastFocus = previous;

    document.getElementById("coName").focus();
}

checkoutBtn.addEventListener("click", openCheckout);

document.getElementById("closeCheckout").addEventListener("click", () => {
    closeOverlay(checkoutOverlay);
});

checkoutOverlay.addEventListener("click", (e) => {
    if (e.target === checkoutOverlay) closeOverlay(checkoutOverlay);
});

checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("coName");
    const email = document.getElementById("coEmail");
    const address = document.getElementById("coAddress");

    [name, email, address].forEach((i) => i.classList.remove("invalid"));
    checkoutError.textContent = "";

    if (name.value.trim().length < 3) {
        name.classList.add("invalid");
        checkoutError.textContent = "Escribí tu nombre completo.";
        name.focus();
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
        email.classList.add("invalid");
        checkoutError.textContent = "Ingresá un correo válido.";
        email.focus();
        return;
    }

    if (address.value.trim().length < 6) {
        address.classList.add("invalid");
        checkoutError.textContent = "Escribí una dirección de entrega.";
        address.focus();
        return;
    }

    // Envía el pedido al servidor (se guarda en PostgreSQL)
    const submitBtn = checkoutForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Procesando...";

    let result;

    try {
        const response = await fetch("/pedidos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cliente: { nombre: name.value.trim(), correo: email.value.trim() },
                items: cart.map((item) => ({ id: Number(item.id), cantidad: item.quantity }))
            })
        });

        result = await response.json().catch(() => ({}));

        if (!response.ok) {
            checkoutError.textContent = result.error || "No se pudo registrar el pedido.";
            return;
        }
    } catch {
        checkoutError.textContent =
            "No se pudo conectar con el servidor. Abrí la tienda desde http://localhost:3000.";
        return;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirmar pedido";
    }

    const orderNumber = "VLT-" + String(result.pedido).padStart(5, "0");
    const firstName = name.value.trim().split(" ")[0];

    document.getElementById("confirmText").textContent =
        `${firstName}, tu pedido ${orderNumber} por ${money(result.total)} fue registrado. ` +
        `Enviaremos el detalle a ${email.value.trim()}.`;

    checkoutStep1.hidden = true;
    checkoutStep2.hidden = false;

    cart = [];
    updateCart();
    closeCart();
    checkoutForm.reset();

    // Actualiza el stock mostrado con lo que quedó en la base de datos
    syncProducts();

    document.getElementById("confirmClose").focus();
});

document.getElementById("confirmClose").addEventListener("click", () => {
    closeOverlay(checkoutOverlay);
    document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
});

// ================= INICIO =================

updateCart();
