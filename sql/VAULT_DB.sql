CREATE DATABASE VAULT_DB;
GO

USE VAULT_DB;
GO

go
CREATE TABLE Productos(

    id INT IDENTITY(1,1) PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL,

    marca VARCHAR(50) NOT NULL,

    talla INT NOT NULL,

    precio DECIMAL(10,2) NOT NULL,

    stock INT NOT NULL,

    imagen VARCHAR(255)

);
go

go
CREATE TABLE Usuarios(

    id INT IDENTITY(1,1) PRIMARY KEY,

    nombre VARCHAR(100),

    correo VARCHAR(100),

    contraseña VARCHAR(100)

);
go

go
CREATE TABLE Carrito(

    id INT IDENTITY(1,1) PRIMARY KEY,

    id_usuario INT,

    id_producto INT,

    cantidad INT,

    FOREIGN KEY(id_usuario)
        REFERENCES Usuarios(id),

    FOREIGN KEY(id_producto)
        REFERENCES Productos(id)

);
go

go
CREATE TABLE Pedidos(

    id INT IDENTITY(1,1) PRIMARY KEY,

    id_usuario INT,

    fecha DATETIME,

    total DECIMAL(10,2),

    FOREIGN KEY(id_usuario)
        REFERENCES Usuarios(id)

);
go

go
CREATE TABLE DetallePedido(

    id INT IDENTITY(1,1) PRIMARY KEY,

    id_pedido INT,

    id_producto INT,

    cantidad INT,

    precio DECIMAL(10,2),

    FOREIGN KEY(id_pedido)
        REFERENCES Pedidos(id),

    FOREIGN KEY(id_producto)
        REFERENCES Productos(id)

);
GO

INSERT INTO Productos
(nombre, marca, talla, precio, stock, imagen)

VALUES

('Nike Air Max DN',
'Nike',
42,
190.00,
15,
'img/products/product1.png'),

('Jordan 4 Retro',
'Jordan',
43,
250.00,
10,
'img/products/product2.png'),

('Adidas Samba',
'Adidas',
41,
120.00,
20,
'img/products/product3.png');

INSERT INTO Usuarios
(nombre, correo, contraseña)

VALUES

('Michelle Jordan',
'michelle@gmail.com',
'123456'),

('Juan Perez',
'juan@gmail.com',
'abcdef');

INSERT INTO Carrito
(id_usuario, id_producto, cantidad)

VALUES

(1, 1, 1),

(1, 2, 2);

SELECT
    u.nombre AS Usuario,
    p.nombre AS Producto,
    c.cantidad,
    p.precio,
    (c.cantidad * p.precio) AS Subtotal

FROM Carrito c

INNER JOIN Usuarios u
ON c.id_usuario = u.id

INNER JOIN Productos p
ON c.id_producto = p.id;

INSERT INTO Pedidos
(id_usuario, fecha, total)

VALUES

(1, GETDATE(), 690.00);

INSERT INTO DetallePedido
(id_pedido, id_producto, cantidad, precio)

VALUES

(1, 1, 1, 190.00),

(1, 2, 2, 250.00);

SELECT
    u.nombre AS Cliente,
    pe.id AS Pedido,
    pe.fecha,
    p.nombre AS Producto,
    dp.cantidad,
    dp.precio,
    (dp.cantidad * dp.precio) AS Subtotal,
    pe.total

FROM Pedidos pe

INNER JOIN Usuarios u
ON pe.id_usuario = u.id

INNER JOIN DetallePedido dp
ON pe.id = dp.id_pedido

INNER JOIN Productos p
ON dp.id_producto = p.id;

