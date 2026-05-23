-- TECAir - Script de poblacion inicial
-- PostgreSQL
--
-- Este script inserta datos base mínimos para una instalación casi final:
-- usuario administrador, aeropuertos/conexiones, aviones/asientos,
-- vuelos, itinerarios y promociones.
--
-- Requisito previo:
-- Ejecutar primero 01_create_schema.sql.

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
    airport_connection,
    seat,
    plane,
    airport,
    passenger,
    student,
    app_user
RESTART IDENTITY CASCADE;

-- =========================
-- Usuarios
-- =========================

-- Usuario administrador inicial.
-- Password de prueba: "123456" usando BCrypt.
INSERT INTO app_user (email, password_hash, name, last_name, phone_number, role)
VALUES
    ('admin@tecair.com', '$2a$11$YV5Wr3pS.UI7h5ODf2oFWupoKbZIXTKHEMWLvjBJSgMSzaRCvzFfO', 'Laura', 'Admin', '8888-3001', 'ADMIN');

-- =========================
-- Aeropuertos
-- =========================

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
-- Conexiones entre aeropuertos
-- =========================

-- Estas conexiones guardan la distancia y duracion estimada que se usan como referencia para los vuelos.
-- Las distancias se calculan con coordenadas aproximadas y cubren todos los pares origen-destino posibles.
WITH airport_coordinates (code, latitude, longitude) AS (
    VALUES
        ('SJO', 9.9939, -84.2088),
        ('LIR', 10.5933, -85.5444),
        ('PTY', 9.0714, -79.3835),
        ('BOG', 4.7016, -74.1469),
        ('MEX', 19.4363, -99.0721),
        ('MIA', 25.7959, -80.2870),
        ('JFK', 40.6413, -73.7781),
        ('YYZ', 43.6777, -79.6248),
        ('GRU', -23.4356, -46.4731),
        ('EZE', -34.8222, -58.5358),
        ('SCL', -33.3928, -70.7858),
        ('LIM', -12.0219, -77.1143),
        ('UIO', -0.1292, -78.3575),
        ('MVD', -34.8384, -56.0308),
        ('ASU', -25.2399, -57.5191),
        ('LPB', -16.5133, -68.1923),
        ('MAD', 40.4983, -3.5676),
        ('CDG', 49.0097, 2.5479),
        ('LHR', 51.4700, -0.4543),
        ('FCO', 41.8003, 12.2389),
        ('FRA', 50.0379, 8.5622),
        ('AMS', 52.3105, 4.7683),
        ('ZRH', 47.4581, 8.5555),
        ('LIS', 38.7742, -9.1342),
        ('IST', 41.2753, 28.7519),
        ('DXB', 25.2532, 55.3657),
        ('DOH', 25.2731, 51.6081),
        ('SIN', 1.3644, 103.9915),
        ('HND', 35.5494, 139.7798),
        ('ICN', 37.4602, 126.4407),
        ('PEK', 40.0799, 116.6031),
        ('DEL', 28.5562, 77.1000),
        ('BKK', 13.6900, 100.7501),
        ('SYD', -33.9399, 151.1753),
        ('AKL', -37.0082, 174.7850),
        ('CAI', 30.1219, 31.4056),
        ('JNB', -26.1337, 28.2420),
        ('CMN', 33.3675, -7.5898),
        ('ADD', 8.9778, 38.7993),
        ('NBO', -1.3192, 36.9278)
),
calculated_connections AS (
    SELECT
        departure.code AS departure_airport_code,
        arrival.code AS arrival_airport_code,
        ROUND(
            3958.8 * 2 * ASIN(
                SQRT(
                    POWER(SIN(RADIANS(arrival.latitude - departure.latitude) / 2), 2)
                    + COS(RADIANS(departure.latitude))
                    * COS(RADIANS(arrival.latitude))
                    * POWER(SIN(RADIANS(arrival.longitude - departure.longitude) / 2), 2)
                )
            )
        )::INTEGER AS distance_miles
    FROM airport_coordinates departure
    CROSS JOIN airport_coordinates arrival
    WHERE departure.code <> arrival.code
)
INSERT INTO airport_connection (
    departure_airport_code,
    arrival_airport_code,
    distance_miles,
    estimated_duration_minutes
)
SELECT
    departure_airport_code,
    arrival_airport_code,
    GREATEST(distance_miles, 1),
    GREATEST(
        CEIL(
            distance_miles::NUMERIC / 500.0 * 60
            + CASE
                WHEN distance_miles < 300 THEN 30
                WHEN distance_miles < 1000 THEN 40
                ELSE 55
            END
        )::INTEGER,
        20
    )
FROM calculated_connections
ORDER BY departure_airport_code, arrival_airport_code;

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

-- Muestra pequeña de vuelos para probar rutas directas y rutas con escala.
INSERT INTO flight (
    flight_id,
    plane_plate,
    airport_departs_from_id,
    airport_arrives_to_id,
    state,
    gate,
    departure_datetime,
    arrival_datetime,
    miles
)
OVERRIDING SYSTEM VALUE
SELECT
    seeded_flights.flight_id,
    seeded_flights.plane_plate,
    seeded_flights.airport_departs_from_id,
    seeded_flights.airport_arrives_to_id,
    seeded_flights.state,
    seeded_flights.gate,
    seeded_flights.departure_datetime,
    seeded_flights.departure_datetime + airport_connection.estimated_duration_minutes * INTERVAL '1 minute',
    airport_connection.distance_miles
FROM (
    VALUES
        (1, 'TI-TEC01', 'SJO', 'PTY', 'OPEN',     'A1', '2026-06-10 08:00:00'::TIMESTAMP),
        (2, 'TI-TEC02', 'PTY', 'BOG', 'OPEN',     'B4', '2026-06-10 11:00:00'::TIMESTAMP),
        (3, 'TI-TEC03', 'BOG', 'MEX', 'UPCOMING', 'C2', '2026-06-10 15:00:00'::TIMESTAMP),
        (4, 'TI-TEC04', 'SJO', 'MIA', 'OPEN',     'A5', '2026-06-12 10:00:00'::TIMESTAMP),
        (5, 'TI-TEC05', 'MIA', 'MEX', 'CLOSED',   'D7', '2026-06-12 15:00:00'::TIMESTAMP)
) AS seeded_flights (
    flight_id,
    plane_plate,
    airport_departs_from_id,
    airport_arrives_to_id,
    state,
    gate,
    departure_datetime
)
JOIN airport_connection
    ON airport_connection.departure_airport_code = seeded_flights.airport_departs_from_id
    AND airport_connection.arrival_airport_code = seeded_flights.airport_arrives_to_id
ORDER BY seeded_flights.flight_id;

-- =========================
-- Itinerarios o rutas vendibles
-- =========================

-- Cinco itinerarios base:
-- 1 directo SJO -> PTY
-- 2 con escala SJO -> PTY -> BOG
-- 3 directo SJO -> MIA
-- 4 borrador con escala PTY -> BOG -> MEX
-- 5 cerrado MIA -> MEX para probar que no aparece en busquedas publicas.
INSERT INTO itinerary (itinerary_id, price, state) OVERRIDING SYSTEM VALUE
VALUES
    (1, 180000.00, 'PUBLIC'),
    (2, 420000.00, 'PUBLIC'),
    (3, 350000.00, 'PUBLIC'),
    (4, 510000.00, 'EDITION'),
    (5, 210000.00, 'CLOSED');

-- Relaciona cada itinerario con sus vuelos.
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
    (4, 3, 4, 1),
    (5, 4, 2, 1),
    (6, 4, 3, 2),
    (7, 5, 5, 1);

-- =========================
-- Promociones
-- =========================

-- Dos promociones base para probar itinerarios con descuento.
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
    ('PROMO-BOGOTA-15', 2, 'https://example.com/promos/bogota.jpg', '2026-05-01', '2026-06-30', 15.00, 357000),
    ('PROMO-MIAMI-10', 3, 'https://example.com/promos/miami.jpg', '2026-06-01', '2026-07-31', 10.00, 315000);

-- =========================
-- Secuencias
-- =========================

-- Esto ajusta las secuencias internas despues de insertar IDs fijos.
-- Evita conflictos si luego se insertan nuevos registros sin especificar ID.
SELECT setval(pg_get_serial_sequence('flight', 'flight_id'), COALESCE(MAX(flight_id), 1)) FROM flight;
SELECT setval(pg_get_serial_sequence('itinerary', 'itinerary_id'), COALESCE(MAX(itinerary_id), 1)) FROM itinerary;
SELECT setval(pg_get_serial_sequence('flight_in_itinerary', 'itinerary_flight_id'), COALESCE(MAX(itinerary_flight_id), 1)) FROM flight_in_itinerary;
SELECT setval(pg_get_serial_sequence('reservation', 'reservation_id'), COALESCE(MAX(reservation_id), 1)) FROM reservation;

