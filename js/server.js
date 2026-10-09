const path = require("path");
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Raíz del proyecto (esta carpeta js/ vive dentro de ella)
const ROOT = path.join(__dirname, "..");

// Sirve el frontend. Solo se exponen index.html, css/, img/ y los dos scripts
// del navegador: así no quedan públicos server.js, package.json ni la carpeta sql/.
app.get("/", (req, res) => res.sendFile(path.join(ROOT, "index.html")));
app.use("/css", express.static(path.join(ROOT, "css")));
app.use("/img", express.static(path.join(ROOT, "img")));

const PUBLIC_SCRIPTS = ["/app.js", "/cart.js"];

app.use("/js", (req, res, next) => {
    if (!PUBLIC_SCRIPTS.includes(req.path)) return res.status(404).end();
    next();
}, express.static(__dirname));

// ==========================================================
// Conexión a PostgreSQL
// Se puede cambiar con variables de entorno:
//   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
// ==========================================================
const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "vault_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "TU_PASSWORD"
});

pool.on("error", (err) => {
    console.error("Error inesperado en la conexión a PostgreSQL:", err.message);
});

// Ruta de prueba
app.get("/api", (req, res) => {
    res.send("Servidor funcionando");
});

// Obtener productos
app.get("/productos", async (req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT id, nombre, marca, talla, precio, stock, imagen FROM productos ORDER BY id"
        );

        // PostgreSQL devuelve DECIMAL como texto; se convierte a número
        res.json(resultado.rows.map((p) => ({ ...p, precio: Number(p.precio) })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener los productos" });
    }
});

// Registrar un pedido
// Body: { cliente: { nombre, correo }, items: [{ id, cantidad }] }
// Los precios SIEMPRE se leen de la base de datos, nunca del navegador.
app.post("/pedidos", async (req, res) => {
    const { cliente, items } = req.body || {};

    const nombre = String(cliente?.nombre || "").trim();
    const correo = String(cliente?.correo || "").trim().toLowerCase();

    if (nombre.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
        return res.status(400).json({ error: "Nombre o correo inválido." });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "El pedido no tiene productos." });
    }

    // Une líneas repetidas y valida cantidades
    const pedidoItems = new Map();

    for (const item of items) {
        const id = Number(item?.id);
        const cantidad = Number(item?.cantidad);

        if (!Number.isInteger(id) || !Number.isInteger(cantidad) || cantidad < 1) {
            return res.status(400).json({ error: "Producto o cantidad inválidos." });
        }

        pedidoItems.set(id, (pedidoItems.get(id) || 0) + cantidad);
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Bloquea los productos para que dos compras a la vez no vendan el mismo stock
        const { rows: productos } = await client.query(
            "SELECT id, nombre, precio, stock FROM productos WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE",
            [[...pedidoItems.keys()]]
        );

        if (productos.length !== pedidoItems.size) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Uno de los productos ya no existe." });
        }

        let total = 0;

        for (const p of productos) {
            const cantidad = pedidoItems.get(p.id);

            if (p.stock < cantidad) {
                await client.query("ROLLBACK");
                return res.status(409).json({
                    error: `No hay suficiente stock de ${p.nombre} (quedan ${p.stock}).`
                });
            }

            total += Number(p.precio) * cantidad;
        }

        // Busca al cliente por correo o lo crea (sin contraseña)
        let { rows: usuario } = await client.query(
            "SELECT id FROM usuarios WHERE lower(correo) = $1 LIMIT 1",
            [correo]
        );

        if (usuario.length === 0) {
            ({ rows: usuario } = await client.query(
                "INSERT INTO usuarios (nombre, correo) VALUES ($1, $2) RETURNING id",
                [nombre, correo]
            ));
        }

        const { rows: pedido } = await client.query(
            "INSERT INTO pedidos (id_usuario, fecha, total) VALUES ($1, NOW(), $2) RETURNING id",
            [usuario[0].id, total]
        );

        for (const p of productos) {
            const cantidad = pedidoItems.get(p.id);

            await client.query(
                "INSERT INTO detallepedido (id_pedido, id_producto, cantidad, precio) VALUES ($1, $2, $3, $4)",
                [pedido[0].id, p.id, cantidad, p.precio]
            );

            await client.query(
                "UPDATE productos SET stock = stock - $1 WHERE id = $2",
                [cantidad, p.id]
            );
        }

        await client.query("COMMIT");

        res.status(201).json({ pedido: pedido[0].id, total });
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        console.error(error);
        res.status(500).json({ error: "No se pudo registrar el pedido." });
    } finally {
        client.release();
    }
});

// Arranca el servidor aunque la base de datos no esté disponible
async function iniciar() {
    try {
        await pool.query("SELECT 1");
        console.log("✅ Base de datos conectada");
    } catch (err) {
        console.error("❌ No se pudo conectar a la base de datos:", err.message);
    }

    app.listen(3000, () => {
        console.log("Servidor iniciado en http://localhost:3000");
    });
}

iniciar();
