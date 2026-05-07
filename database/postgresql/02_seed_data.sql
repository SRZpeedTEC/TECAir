-- TECAir - Script de poblacion inicial
-- PostgreSQL
--
-- Este script inserta datos de prueba suficientes para probar:
-- busqueda de vuelos, reservaciones, promociones, check-in y maletas.
--
-- Requisito previo:
-- Ejecutar primero 01_create_schema.sql.

BEGIN;

SET search_path TO tecair;

-- Esto limpia las tablas antes de insertar datos.
-- Sirve para poder ejecutar este script varias veces durante pruebas.
TRUNCATE TABLE
    baggage,
    check_in,
    reservation,
    promotion,
    flight_in_itinerary,
    itinerary,
    flight,
    seat,
    plane,
    airport,
    passenger,
    student,
    app_user
RESTART IDENTITY CASCADE;

-- =========================
-- Usuarios y estudiantes
-- =========================

-- Estos usuarios permiten probar clientes normales, estudiantes, funcionarios y administradores.
INSERT INTO app_user (email, password_hash, name,  last_name, phone_number, role)
VALUES
    ('ana.rojas@tecair.com', 'hash_demo_ana', 'Ana', 'Rojas', '8888-1001', 'CLIENT'),
    ('carlos.mora@tecair.com', 'hash_demo_carlos', 'Carlos', 'Mora', '8888-1002', 'CLIENT'),
    ('sofia.salas@tecair.com', 'hash_demo_sofia', 'Sofia', 'Salas', '8888-1003', 'CLIENT'),
    ('marco.aeropuerto@tecair.com', 'hash_demo_marco', 'Marco', 'Vargas', '8888-2001', 'CLIENT'),
    ('admin@tecair.com', 'hash_demo_admin', 'Laura', 'Admin', '8888-3001', 'ADMIN');

-- Estos registros identifican cuales usuarios son estudiantes y acumulan millas.
INSERT INTO student (user_email, user_carnet, college_name, miles)
VALUES
    ('ana.rojas@tecair.com', '2026123456', 'Instituto Tecnologico de Costa Rica', 2500),
    ('sofia.salas@tecair.com', '2026987654', 'Universidad de Costa Rica', 1200);

-- =========================
-- Pasajeros
-- =========================

-- Estos pasajeros permiten separar quien compra de quien viaja.
-- En algunos casos el pasajero es el mismo usuario; en otros, el usuario reserva para otra persona.
INSERT INTO passenger (passport_id, birthday, gender, name, Lname)
VALUES
    ('CR-A1234567', '2001-04-18', 'FEMALE', 'Ana', 'Rojas'),
    ('CR-C7654321', '1998-09-27', 'MALE', 'Carlos', 'Mora'),
    ('CR-S1122334', '2003-01-12', 'FEMALE', 'Sofia', 'Salas'),
    ('CR-M4455667', '1995-07-03', 'MALE', 'Marco', 'Vargas'),
    ('PA-L9988776', '1988-11-22', 'OTHER', 'Lucia', 'Pereira');

-- =========================
-- Aeropuertos
-- =========================

-- Estos aeropuertos permiten probar busquedas por origen y destino.
INSERT INTO airport (airport_name, city, country, code)
VALUES
    ('Aeropuerto Internacional Juan Santamaria', 'San Jose', 'Costa Rica', 'SJO'),
    ('Aeropuerto Internacional Daniel Oduber', 'Liberia', 'Costa Rica', 'LIR'),
    ('Aeropuerto Internacional Tocumen', 'Ciudad de Panama', 'Panama', 'PTY'),
    ('Aeropuerto Internacional El Dorado', 'Bogota', 'Colombia', 'BOG'),
    ('Aeropuerto Internacional Benito Juarez', 'Ciudad de Mexico', 'Mexico', 'MEX'),
    ('Aeropuerto Internacional de Miami', 'Miami', 'Estados Unidos', 'MIA');

-- =========================
-- Aviones y asientos
-- =========================

-- Estos aviones se usan en los vuelos de prueba.
INSERT INTO plane (plate, model, capacity)
VALUES
    ('TI-TEC01', 'Airbus A320', 12),
    ('TI-TEC02', 'Boeing 737-800', 12),
    ('TI-TEC03', 'Embraer E190', 8);

-- Estos asientos pertenecen al avion TI-TEC01.
INSERT INTO seat (plane_plate, seat_number)
VALUES
    ('TI-TEC01', '1A'), ('TI-TEC01', '1B'), ('TI-TEC01', '1C'), ('TI-TEC01', '1D'),
    ('TI-TEC01', '2A'), ('TI-TEC01', '2B'), ('TI-TEC01', '2C'), ('TI-TEC01', '2D'),
    ('TI-TEC01', '3A'), ('TI-TEC01', '3B'), ('TI-TEC01', '3C'), ('TI-TEC01', '3D');

-- Estos asientos pertenecen al avion TI-TEC02.
INSERT INTO seat (plane_plate, seat_number)
VALUES
    ('TI-TEC02', '1A'), ('TI-TEC02', '1B'), ('TI-TEC02', '1C'), ('TI-TEC02', '1D'),
    ('TI-TEC02', '2A'), ('TI-TEC02', '2B'), ('TI-TEC02', '2C'), ('TI-TEC02', '2D'),
    ('TI-TEC02', '3A'), ('TI-TEC02', '3B'), ('TI-TEC02', '3C'), ('TI-TEC02', '3D');

-- Estos asientos pertenecen al avion TI-TEC03.
INSERT INTO seat (plane_plate, seat_number)
VALUES
    ('TI-TEC03', '1A'), ('TI-TEC03', '1B'), ('TI-TEC03', '1C'), ('TI-TEC03', '1D'),
    ('TI-TEC03', '2A'), ('TI-TEC03', '2B'), ('TI-TEC03', '2C'), ('TI-TEC03', '2D');

-- =========================
-- Vuelos
-- =========================

-- Estos vuelos permiten probar rutas directas y rutas con escala.
INSERT INTO flight (
    flight_id,
    plane_plate,
    airport_departs_from_id,
    airport_arrives_to_id,
    state,
    gate,
    departure_datetime,
    arrival_datetime
)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 'TI-TEC01', 'Aeropuerto Internacional Juan Santamaria', 'Aeropuerto Internacional Tocumen', 'OPEN',   'A1', '2026-06-10 08:00:00', '2026-06-10 09:20:00'),
    (2, 'TI-TEC02', 'Aeropuerto Internacional Tocumen', 'Aeropuerto Internacional El Dorado', 'OPEN',         'B4', '2026-06-10 11:00:00', '2026-06-10 12:40:00'),
    (3, 'TI-TEC03', 'Aeropuerto Internacional Juan Santamaria', 'Aeropuerto Internacional Daniel Oduber', 'OPEN', 'A3', '2026-06-11 07:30:00', '2026-06-11 08:15:00'),
    (4, 'TI-TEC01', 'Aeropuerto Internacional Juan Santamaria', 'Aeropuerto Internacional de Miami', 'OPEN',   'A5', '2026-06-12 10:00:00', '2026-06-12 14:00:00'),
    (5, 'TI-TEC02', 'Aeropuerto Internacional de Miami', 'Aeropuerto Internacional Benito Juarez', 'OPEN',     'C2', '2026-06-13 09:00:00', '2026-06-13 12:30:00'),
    (6, 'TI-TEC03', 'Aeropuerto Internacional Daniel Oduber', 'Aeropuerto Internacional Juan Santamaria', 'CLOSED', 'L1', '2026-06-09 18:00:00', '2026-06-09 18:45:00');

-- =========================
-- Itinerarios o rutas vendibles
-- =========================

-- Estos itinerarios representan las rutas que el cliente puede reservar.
-- Un itinerario directo tiene un vuelo; un itinerario con escala tiene varios vuelos.
INSERT INTO itinerary (itinerary_id, price) OVERRIDING SYSTEM VALUE
VALUES
    (1, 180.00),
    (2, 420.00),
    (3, 95.00),
    (4, 350.00),
    (5, 510.00);

-- Esto relaciona cada itinerario con sus vuelos.
-- flight_order indica el orden de los vuelos dentro de la ruta.
INSERT INTO flight_in_itinerary (
    itinerary_flight_id,
    itinerary_id,
    flight_id,
    flight_order
)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 1, 1, 'DIRECT'),
    (2, 2, 1, 'CONNECTION'),
    (3, 2, 2, 'CONNECTION'),
    (4, 3, 3, 'DIRECT'),
    (5, 4, 4, 'DIRECT'),
    (6, 5, 4, 'CONNECTION'),
    (7, 5, 5, 'CONNECTION');

-- =========================
-- Promociones
-- =========================

-- Estas promociones permiten probar descuentos activos, futuros y vencidos.
INSERT INTO promotion (
    promotion_code,
    itinerary_id,
    image_url,
    start_date,
    end_date,
    discount_percent,
    promo_price
)
VALUES
    ('PROMO-PANAMA-15', 1, 'https://example.com/promos/panama.jpg', '2026-05-01', '2026-06-30', 15.00, 153),
    ('PROMO-LIBERIA-20', 3, 'https://example.com/promos/liberia.jpg', '2026-05-01', '2026-05-31', 20.00, 76),
    ('PROMO-MIAMI-10', 4, 'https://example.com/promos/miami.jpg', '2026-06-01', '2026-07-31', 10.00, 315),
    ('PROMO-BOGOTA-EXP', 2, NULL, '2026-03-01', '2026-04-30', 25.00, 315);

-- =========================
-- Reservaciones
-- =========================

-- Estas reservaciones permiten probar pagos realizados y check-in.
INSERT INTO reservation (
    reservation_id,
    itinerary_id,
    user_email,
    state,
    payment_reference,
    passenger_id
)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 1, 'ana.rojas@tecair.com', 'PAID', 'PAY-TECAIR-0001', 'CR-A1234567'),
    (2, 3, 'carlos.mora@tecair.com', 'CHECKED', 'PAY-TECAIR-0002', 'CR-C7654321'),
    (3, 4, 'sofia.salas@tecair.com', 'CHECKED', 'PAY-TECAIR-0003', 'CR-S1122334'),
    (4, 2, 'ana.rojas@tecair.com', 'PAID','PAY-TECAIR-0004', 'PA-L9988776'),
    (5, 5, 'carlos.mora@tecair.com', 'CHECKED', 'PAY-TECAIR-0005', 'CR-M4455667');

-- =========================
-- Check-in
-- =========================

-- Estos check-ins asignan asientos a pasajeros ya reservados.
-- Sirven para probar pase de abordar, asiento, vuelo y puerta.
INSERT INTO check_in (
    confirmation_number,
    reservation_id,
    itinerary_flight_id,
    plane_plate,
    seat_number
)
VALUES
    ('CHK-0001', 2, 4, 'TI-TEC03', '1A'),
    ('CHK-0002', 3, 5, 'TI-TEC01', '1A'),
    ('CHK-0003', 5, 6, 'TI-TEC01', '1B'),
    ('CHK-0004', 5, 7, 'TI-TEC02', '2A');

-- =========================
-- Maletas
-- =========================

-- Estas maletas permiten probar diferentes cobros:
-- CHK-0001 tiene 1 maleta: adicional esperado 0.
-- CHK-0002 tiene 2 maletas: adicional esperado 50.
-- CHK-0003 tiene 3 maletas: adicional esperado 125.
-- CHK-0004 tiene 5 maletas: adicional esperado 275.
INSERT INTO baggage (bag_number, confirmation_number, weight, color)
VALUES
    ('BAG-0001', 'CHK-0001', 18.50, 'Negro'),
    ('BAG-0002', 'CHK-0002', 20.00, 'Azul'),
    ('BAG-0003', 'CHK-0002', 17.25, 'Rojo'),
    ('BAG-0004', 'CHK-0003', 19.10, 'Gris'),
    ('BAG-0005', 'CHK-0003', 21.00, 'Negro'),
    ('BAG-0006', 'CHK-0003', 16.75, 'Verde'),
    ('BAG-0007', 'CHK-0004', 18.20, 'Negro'),
    ('BAG-0008', 'CHK-0004', 22.00, 'Azul'),
    ('BAG-0009', 'CHK-0004', 15.40, 'Rojo'),
    ('BAG-0010', 'CHK-0004', 19.90, 'Morado'),
    ('BAG-0011', 'CHK-0004', 14.80, 'Gris');

-- Esto ajusta las secuencias internas despues de insertar IDs fijos.
-- Evita conflictos si luego se insertan nuevos registros sin especificar ID.
SELECT setval(pg_get_serial_sequence('flight', 'flight_id'), COALESCE(MAX(flight_id), 1)) FROM flight;
SELECT setval(pg_get_serial_sequence('itinerary', 'itinerary_id'), COALESCE(MAX(itinerary_id), 1)) FROM itinerary;
SELECT setval(pg_get_serial_sequence('flight_in_itinerary', 'itinerary_flight_id'), COALESCE(MAX(itinerary_flight_id), 1)) FROM flight_in_itinerary;
SELECT setval(pg_get_serial_sequence('reservation', 'reservation_id'), COALESCE(MAX(reservation_id), 1)) FROM reservation;

COMMIT;
