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
-- Todos usan la contrasena de prueba "123456", almacenada como BCrypt para no sembrar passwords planos.
INSERT INTO app_user (email, password_hash, name,  last_name, phone_number, role)
VALUES
    ('ana.rojas@tecair.com', '$2a$11$YV5Wr3pS.UI7h5ODf2oFWupoKbZIXTKHEMWLvjBJSgMSzaRCvzFfO', 'Ana', 'Rojas', '8888-1001', 'CLIENT'),
    ('carlos.mora@tecair.com', '$2a$11$YV5Wr3pS.UI7h5ODf2oFWupoKbZIXTKHEMWLvjBJSgMSzaRCvzFfO', 'Carlos', 'Mora', '8888-1002', 'CLIENT'),
    ('sofia.salas@tecair.com', '$2a$11$YV5Wr3pS.UI7h5ODf2oFWupoKbZIXTKHEMWLvjBJSgMSzaRCvzFfO', 'Sofia', 'Salas', '8888-1003', 'CLIENT'),
    ('marco.aeropuerto@tecair.com', '$2a$11$YV5Wr3pS.UI7h5ODf2oFWupoKbZIXTKHEMWLvjBJSgMSzaRCvzFfO', 'Marco', 'Vargas', '8888-2001', 'CLIENT'),
    ('admin@tecair.com', '$2a$11$YV5Wr3pS.UI7h5ODf2oFWupoKbZIXTKHEMWLvjBJSgMSzaRCvzFfO', 'Laura', 'Admin', '8888-3001', 'ADMIN');

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

-- Estos aeropuertos permiten probar busquedas por origen y destino en varios paises.
INSERT INTO airport (code, airport_name, city, country)
VALUES
    ('SJO', 'Aeropuerto Internacional Juan Santamaria', 'San Jose', 'Costa Rica'),
    ('LIR', 'Aeropuerto Internacional Daniel Oduber', 'Liberia', 'Costa Rica'),
    ('PTY', 'Aeropuerto Internacional Tocumen', 'Ciudad de Panama', 'Panama'),
    ('BOG', 'Aeropuerto Internacional El Dorado', 'Bogota', 'Colombia'),
    ('MEX', 'Aeropuerto Internacional Benito Juarez', 'Ciudad de Mexico', 'Mexico'),
    ('MIA', 'Aeropuerto Internacional de Miami', 'Miami', 'Estados Unidos'),
    ('JFK', 'Aeropuerto Internacional John F. Kennedy', 'Nueva York', 'Estados Unidos'),
    ('YYZ', 'Aeropuerto Internacional Toronto Pearson', 'Toronto', 'Canada'),
    ('GRU', 'Aeropuerto Internacional Sao Paulo Guarulhos', 'Sao Paulo', 'Brasil'),
    ('EZE', 'Aeropuerto Internacional Ministro Pistarini', 'Buenos Aires', 'Argentina'),
    ('SCL', 'Aeropuerto Internacional Arturo Merino Benitez', 'Santiago', 'Chile'),
    ('LIM', 'Aeropuerto Internacional Jorge Chavez', 'Lima', 'Peru'),
    ('UIO', 'Aeropuerto Internacional Mariscal Sucre', 'Quito', 'Ecuador'),
    ('MVD', 'Aeropuerto Internacional de Carrasco', 'Montevideo', 'Uruguay'),
    ('ASU', 'Aeropuerto Internacional Silvio Pettirossi', 'Asuncion', 'Paraguay'),
    ('LPB', 'Aeropuerto Internacional El Alto', 'La Paz', 'Bolivia'),
    ('MAD', 'Aeropuerto Adolfo Suarez Madrid-Barajas', 'Madrid', 'Espana'),
    ('CDG', 'Aeropuerto Charles de Gaulle', 'Paris', 'Francia'),
    ('LHR', 'Aeropuerto de Heathrow', 'Londres', 'Reino Unido'),
    ('FCO', 'Aeropuerto Leonardo da Vinci-Fiumicino', 'Roma', 'Italia'),
    ('FRA', 'Aeropuerto de Frankfurt', 'Frankfurt', 'Alemania'),
    ('AMS', 'Aeropuerto Schiphol de Amsterdam', 'Amsterdam', 'Paises Bajos'),
    ('ZRH', 'Aeropuerto de Zurich', 'Zurich', 'Suiza'),
    ('LIS', 'Aeropuerto Humberto Delgado', 'Lisboa', 'Portugal'),
    ('IST', 'Aeropuerto de Estambul', 'Estambul', 'Turquia'),
    ('DXB', 'Aeropuerto Internacional de Dubai', 'Dubai', 'Emiratos Arabes Unidos'),
    ('DOH', 'Aeropuerto Internacional Hamad', 'Doha', 'Qatar'),
    ('SIN', 'Aeropuerto Changi de Singapur', 'Singapur', 'Singapur'),
    ('HND', 'Aeropuerto de Haneda', 'Tokio', 'Japon'),
    ('ICN', 'Aeropuerto Internacional de Incheon', 'Seul', 'Corea del Sur'),
    ('PEK', 'Aeropuerto Internacional de Pekin-Capital', 'Pekin', 'China'),
    ('DEL', 'Aeropuerto Internacional Indira Gandhi', 'Nueva Delhi', 'India'),
    ('BKK', 'Aeropuerto Suvarnabhumi', 'Bangkok', 'Tailandia'),
    ('SYD', 'Aeropuerto Kingsford Smith', 'Sidney', 'Australia'),
    ('AKL', 'Aeropuerto Internacional de Auckland', 'Auckland', 'Nueva Zelanda'),
    ('CAI', 'Aeropuerto Internacional de El Cairo', 'El Cairo', 'Egipto'),
    ('JNB', 'Aeropuerto Internacional O. R. Tambo', 'Johannesburgo', 'Sudafrica'),
    ('CMN', 'Aeropuerto Internacional Mohammed V', 'Casablanca', 'Marruecos'),
    ('ADD', 'Aeropuerto Internacional Bole', 'Adis Abeba', 'Etiopia'),
    ('NBO', 'Aeropuerto Internacional Jomo Kenyatta', 'Nairobi', 'Kenia');

-- =========================
-- Aviones y asientos
-- =========================

-- Estos aviones se usan en los vuelos de prueba.
-- Todas las capacidades estan entre 150 y 180, y son multiplos de 6 para filas completas A-F.
INSERT INTO plane (plate, model, capacity)
VALUES
    ('TI-TEC01', 'Airbus A320', 180),
    ('TI-TEC02', 'Boeing 737-800', 174),
    ('TI-TEC03', 'Airbus A320neo', 150),
    ('TI-TEC04', 'Boeing 737 MAX 8', 168),
    ('TI-TEC05', 'Airbus A320', 162),
    ('TI-TEC06', 'Boeing 737-800', 156),
    ('TI-TEC07', 'Airbus A320neo', 180),
    ('TI-TEC08', 'Boeing 737 MAX 8', 174),
    ('TI-TEC09', 'Airbus A320', 150),
    ('TI-TEC10', 'Boeing 737-800', 168),
    ('TI-TEC11', 'Airbus A320neo', 162),
    ('TI-TEC12', 'Boeing 737 MAX 8', 156),
    ('TI-TEC13', 'Airbus A320', 180),
    ('TI-TEC14', 'Boeing 737-800', 174),
    ('TI-TEC15', 'Airbus A320neo', 150),
    ('TI-TEC16', 'Boeing 737 MAX 8', 168),
    ('TI-TEC17', 'Airbus A320', 162),
    ('TI-TEC18', 'Boeing 737-800', 156),
    ('TI-TEC19', 'Airbus A320neo', 180),
    ('TI-TEC20', 'Boeing 737 MAX 8', 174),
    ('TI-TEC21', 'Airbus A320', 150),
    ('TI-TEC22', 'Boeing 737-800', 168),
    ('TI-TEC23', 'Airbus A320neo', 162),
    ('TI-TEC24', 'Boeing 737 MAX 8', 156),
    ('TI-TEC25', 'Airbus A320', 180),
    ('TI-TEC26', 'Boeing 737-800', 174),
    ('TI-TEC27', 'Airbus A320neo', 150),
    ('TI-TEC28', 'Boeing 737 MAX 8', 168),
    ('TI-TEC29', 'Airbus A320', 162),
    ('TI-TEC30', 'Boeing 737-800', 156),
    ('TI-TEC31', 'Airbus A320neo', 180),
    ('TI-TEC32', 'Boeing 737 MAX 8', 174),
    ('TI-TEC33', 'Airbus A320', 150),
    ('TI-TEC34', 'Boeing 737-800', 168),
    ('TI-TEC35', 'Airbus A320neo', 162),
    ('TI-TEC36', 'Boeing 737 MAX 8', 156);

-- Genera los asientos de cada avion segun su capacidad: filas numeradas y columnas A-F.
INSERT INTO seat (plane_plate, seat_number)
SELECT
    p.plate,
    seat_rows.row_number::TEXT || letters.seat_letter
FROM plane p
CROSS JOIN LATERAL generate_series(1, p.capacity / 6) AS seat_rows(row_number)
CROSS JOIN (VALUES ('A'), ('B'), ('C'), ('D'), ('E'), ('F')) AS letters(seat_letter)
ORDER BY p.plate, seat_rows.row_number, letters.seat_letter;

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
    (1, 'TI-TEC01', 'SJO', 'PTY', 'OPEN',   'A1',
     '2026-06-10 08:00:00', '2026-06-10 09:20:00'),

    (2, 'TI-TEC02', 'PTY', 'BOG', 'OPEN',   'B4',
     '2026-06-10 11:00:00', '2026-06-10 12:40:00'),

    (3, 'TI-TEC03', 'SJO', 'LIR', 'OPEN',   'A3',
     '2026-06-11 07:30:00', '2026-06-11 08:15:00'),

    (4, 'TI-TEC01', 'SJO', 'MIA', 'OPEN',   'A5',
     '2026-06-12 10:00:00', '2026-06-12 14:00:00'),

    (5, 'TI-TEC02', 'MIA', 'MEX', 'OPEN',   'C2',
     '2026-06-13 09:00:00', '2026-06-13 12:30:00'),

    (6, 'TI-TEC03', 'LIR', 'SJO', 'CLOSED', 'L1',
     '2026-06-09 18:00:00', '2026-06-09 18:45:00'),

    (7, 'TI-TEC03', 'LIR', 'MEX', 'UPCOMING', 'L2',
     '2026-06-15 08:00:00', '2026-06-15 11:00:00');
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
    (1, 1, 1, 1),
    (2, 2, 1, 1),
    (3, 2, 2, 2),
    (4, 3, 3, 1),
    (5, 4, 4, 1),
    (6, 5, 4, 1),
    (7, 5, 5, 2);

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
    (1, 1, 'ana.rojas@tecair.com', 'PAID',    'PAY-TECAIR-0001', 'CR-A1234567'),
    (2, 3, 'carlos.mora@tecair.com', 'CHECKED', 'PAY-TECAIR-0002', 'CR-C7654321'),
    (3, 4, 'sofia.salas@tecair.com', 'CHECKED', 'PAY-TECAIR-0003', 'CR-S1122334'),
    (4, 2, 'ana.rojas@tecair.com', 'PAID',    'PAY-TECAIR-0004', 'PA-L9988776'),
    (5, 5, 'carlos.mora@tecair.com', 'CHECKED', 'PAY-TECAIR-0005', 'CR-M4455667');

-- =========================
-- Check-in
-- =========================

-- Estos check-ins asignan asientos a pasajeros ya reservados.
-- Sirven para probar pase de abordar, asiento, vuelo y puerta.
INSERT INTO check_in (
    reservation_id,
    itinerary_flight_id,
    plane_plate,
    seat_number
)
VALUES
    (2, 4, 'TI-TEC03', '1A'),
    (3, 5, 'TI-TEC01', '1A'),
    (5, 6, 'TI-TEC01', '1B'),
    (5, 7, 'TI-TEC02', '2A');

-- =========================
-- Maletas
-- =========================

-- Estas maletas permiten probar diferentes cobros:
-- CHK-0001 tiene 1 maleta: adicional esperado 0.
-- CHK-0002 tiene 2 maletas: adicional esperado 50.
-- CHK-0003 tiene 3 maletas: adicional esperado 125.
-- CHK-0004 tiene 5 maletas: adicional esperado 275.
INSERT INTO baggage (
    confirmation_number,
    weight,
    color
)
VALUES
    (1, 18.50, 'Negro'),

    (2, 20.00, 'Azul'),
    (2, 17.25, 'Rojo'),

    (3, 19.10, 'Gris'),
    (3, 21.00, 'Negro'),
    (3, 16.75, 'Verde'),

    (4, 18.20, 'Negro'),
    (4, 22.00, 'Azul'),
    (4, 15.40, 'Rojo'),
    (4, 19.90, 'Morado'),
    (4, 14.80, 'Gris');

-- Esto ajusta las secuencias internas despues de insertar IDs fijos.
-- Evita conflictos si luego se insertan nuevos registros sin especificar ID.
SELECT setval(pg_get_serial_sequence('flight', 'flight_id'), COALESCE(MAX(flight_id), 1)) FROM flight;
SELECT setval(pg_get_serial_sequence('itinerary', 'itinerary_id'), COALESCE(MAX(itinerary_id), 1)) FROM itinerary;
SELECT setval(pg_get_serial_sequence('flight_in_itinerary', 'itinerary_flight_id'), COALESCE(MAX(itinerary_flight_id), 1)) FROM flight_in_itinerary;
SELECT setval(pg_get_serial_sequence('reservation', 'reservation_id'), COALESCE(MAX(reservation_id), 1)) FROM reservation;

COMMIT;
