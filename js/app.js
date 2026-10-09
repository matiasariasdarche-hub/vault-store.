/* ======================================================
   VAULT - APP.JS
   Navegación, búsqueda, filtro por marca, orden y newsletter
====================================================== */

// ===================== UTILIDADES =====================

function normalizeText(text) {
    return String(text)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim();
}

let toastTimer;

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

// ===================== HEADER Y MENÚ =====================

const header = document.getElementById("siteHeader");
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

function onScroll() {
    header.classList.toggle("scrolled", window.scrollY > 40);
}

window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

function setMenu(open) {
    navLinks.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    menuToggle.querySelector("i").className = open ? "bi bi-x-lg" : "bi bi-list";
}

menuToggle.addEventListener("click", () => {
    setMenu(!navLinks.classList.contains("open"));
});

navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
});

// Resalta en el menú la sección que se está viendo
const sectionLinks = [...navLinks.querySelectorAll("a")];

if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                sectionLinks.forEach((link) => {
                    link.classList.toggle(
                        "active",
                        link.getAttribute("href") === "#" + entry.target.id
                    );
                });
            });
        },
        { rootMargin: "-45% 0px -50% 0px" }
    );

    sectionLinks.forEach((link) => {
        const target = document.querySelector(link.getAttribute("href"));
        if (target) observer.observe(target);
    });
}

// ===================== FILTROS DE PRODUCTOS =====================

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchMessage = document.getElementById("searchMessage");
const sortSelect = document.getElementById("sortSelect");
const brandMessage = document.getElementById("brandMessage");
const brandButtons = [...document.querySelectorAll(".brand-btn")];
const productsGrid = document.getElementById("products");
const productCards = [...document.querySelectorAll(".products .card")];
const emptyState = document.getElementById("emptyState");
const emptyText = document.getElementById("emptyText");
const resetFilters = document.getElementById("resetFilters");

// Guarda el orden original para poder restaurarlo
productCards.forEach((card, i) => (card.dataset.index = i));

// Texto de stock de cada tarjeta ("quedan pocas unidades" si es bajo)
function renderStock(card) {
    const stock = Number(card.dataset.stock);
    const label = card.querySelector(".stock-label");
    const button = card.querySelector(".add-cart");

    if (label) {
        label.classList.toggle("low", stock <= 10);
        label.textContent = stock <= 0
            ? "Agotado"
            : stock <= 10 ? `¡Últimas ${stock}!` : `${stock} disponibles`;
    }

    if (button) button.disabled = stock <= 0;
}

productCards.forEach(renderStock);

// Cantidad de modelos por marca (en cada botón) y cifras de "Nosotros"
brandButtons.forEach((button) => {
    const total = productCards.filter(
        (card) => normalizeText(card.dataset.brand) === normalizeText(button.dataset.brand)
    ).length;

    const counter = button.querySelector(".brand-count");

    if (counter) {
        counter.textContent = total === 0
            ? "Próximamente"
            : total === 1 ? "1 modelo" : `${total} modelos`;
        counter.classList.toggle("empty", total === 0);
    }
});

const statModels = document.getElementById("statModels");
const statBrands = document.getElementById("statBrands");

if (statModels) statModels.textContent = productCards.length;
if (statBrands) statBrands.textContent = brandButtons.length;

// Si el servidor y la base de datos están activos, precio, talla y stock
// se toman de PostgreSQL. Si no, se queda con los valores del HTML.
async function syncProducts() {
    try {
        const response = await fetch("/productos");
        if (!response.ok) return;

        const productos = await response.json();

        productos.forEach((p) => {
            const card = productCards.find((c) => c.dataset.id === String(p.id));
            if (!card) return;

            card.dataset.price = p.precio;
            card.dataset.stock = p.stock;
            card.dataset.size = p.talla;

            card.querySelector(".price").textContent = "$" + Number(p.precio).toLocaleString("en-US");
            card.querySelector(".card-meta").firstChild.textContent = `Talla ${p.talla} · `;

            renderStock(card);
        });
    } catch {
        /* sin servidor: se muestran los datos del HTML */
    }
}

syncProducts();

const filters = { query: "", brand: "" };

function applyFilters() {
    const query = normalizeText(filters.query);
    let visible = 0;

    productCards.forEach((card) => {
        const name = normalizeText(card.dataset.name);
        const brand = normalizeText(card.dataset.brand);

        const matchesText = query === "" || name.includes(query) || brand.includes(query);
        const matchesBrand = filters.brand === "" || brand === filters.brand;
        const show = matchesText && matchesBrand;

        card.hidden = !show;
        if (show) visible++;
    });

    // Orden
    const mode = sortSelect.value;
    const sorted = [...productCards].sort((a, b) => {
        if (mode === "price-asc") return a.dataset.price - b.dataset.price;
        if (mode === "price-desc") return b.dataset.price - a.dataset.price;
        if (mode === "name") return a.dataset.name.localeCompare(b.dataset.name);
        return a.dataset.index - b.dataset.index;
    });

    sorted.forEach((card) => productsGrid.appendChild(card));

    // Mensajes
    const activeBrandBtn = brandButtons.find((b) => b.classList.contains("active"));
    const brandName = activeBrandBtn
        ? activeBrandBtn.querySelector(".brand-name").textContent.trim()
        : "";

    searchMessage.textContent =
        query !== "" && visible > 0 ? `Se encontraron ${visible} producto(s).` : "";

    if (brandName) {
        brandMessage.textContent =
            visible === 0 && query === ""
                ? `No hay stock de ${brandName} en este momento.`
                : `Mostrando ${visible} producto(s) de ${brandName}.`;
    } else {
        brandMessage.textContent = "";
    }

    // Estado vacío
    emptyState.hidden = visible !== 0;

    if (visible === 0) {
        emptyText.textContent = brandName && query === ""
            ? `No hay stock de ${brandName} en este momento.`
            : "No se encontraron productos con esos filtros.";
    }
}

// Búsqueda por texto (en vivo y con el botón / Enter)
searchInput.addEventListener("input", () => {
    filters.query = searchInput.value;
    applyFilters();
});

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    filters.query = searchInput.value;
    applyFilters();
});

// Orden
sortSelect.addEventListener("change", applyFilters);

// Marcas: un clic filtra, otro clic sobre la misma lo quita
brandButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const wasActive = button.classList.contains("active");

        brandButtons.forEach((b) => {
            b.classList.remove("active");
            b.setAttribute("aria-pressed", "false");
        });

        if (wasActive) {
            filters.brand = "";
        } else {
            button.classList.add("active");
            button.setAttribute("aria-pressed", "true");
            filters.brand = normalizeText(button.dataset.brand);
        }

        applyFilters();

        if (!wasActive) {
            document.getElementById("shop").scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
});

// Quitar todos los filtros
resetFilters.addEventListener("click", () => {
    filters.query = "";
    filters.brand = "";
    searchInput.value = "";
    sortSelect.value = "default";

    brandButtons.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
    });

    applyFilters();
});

// Lupa del navbar: lleva al buscador y lo enfoca
document.getElementById("searchIcon").addEventListener("click", () => {
    searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => searchInput.focus({ preventScroll: true }), 350);
});

// ===================== NEWSLETTER =====================

const newsletterForm = document.getElementById("newsletterForm");
const newsletterEmail = document.getElementById("newsletterEmail");
const newsletterMessage = document.getElementById("newsletterMessage");

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function readSubscribers() {
    try {
        return JSON.parse(localStorage.getItem("vault_subscribers")) || [];
    } catch {
        return [];
    }
}

newsletterForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = newsletterEmail.value.trim().toLowerCase();

    newsletterMessage.className = "results-message";
    newsletterEmail.classList.remove("invalid");

    if (!isValidEmail(email)) {
        newsletterEmail.classList.add("invalid");
        newsletterMessage.classList.add("error");
        newsletterMessage.textContent = "Ingresá un correo válido, por ejemplo nombre@correo.com.";
        newsletterEmail.focus();
        return;
    }

    const subscribers = readSubscribers();

    if (subscribers.includes(email)) {
        newsletterMessage.textContent = "Ese correo ya está suscrito.";
        return;
    }

    subscribers.push(email);

    try {
        localStorage.setItem("vault_subscribers", JSON.stringify(subscribers));
    } catch {
        /* sin almacenamiento disponible: se confirma igual */
    }

    newsletterForm.reset();
    newsletterMessage.classList.add("success");
    newsletterMessage.textContent = "¡Listo! Te suscribiste a las novedades de VAULT.";
});
