-- ============================================================
-- TECAir - Consultas de visualizacion y verificacion
-- PostgreSQL
-- ============================================================
--
-- Este archivo NO crea ni modifica datos.
-- Su objetivo es mostrar ejemplos bonitos para revisar que la base
-- funciona correctamente despues de ejecutar:
--
--   1) 01_create_schema.sql
--   2) 02_seed_data.sql
--
-- Puedes ejecutar estas consultas completas o por secciones en pgAdmin.
-- Sirven para demostrar busqueda de vuelos, rutas, promociones,
-- reservaciones, check-in y cobro de maletas.

SET search_path TO tecair;

-- ============================================================
-- 1. Resumen general de datos cargados
-- ============================================================
-- Esta consulta muestra cuantas filas tiene cada tabla principal.

SELECT 'app_user' AS table_name, COUNT(*) AS total_rows FROM app_user
UNION ALL
SELECT 'student', COUNT(*) FROM student
UNION ALL
SELECT 'passenger', COUNT(*) FROM passenger
UNION ALL
SELECT 'airport', COUNT(*) FROM airport
UNION ALL
SELECT 'plane', COUNT(*) FROM plane
UNION ALL
SELECT 'seat', COUNT(*) FROM seat
UNION ALL
SELECT 'flight', COUNT(*) FROM flight
UNION ALL
SELECT 'itinerary', COUNT(*) FROM itinerary
UNION ALL
SELECT 'flight_in_itinerary', COUNT(*) FROM flight_in_itinerary
UNION ALL
SELECT 'promotion', COUNT(*) FROM promotion
UNION ALL
SELECT 'reservation', COUNT(*) FROM reservation
UNION ALL
SELECT 'check_in', COUNT(*) FROM check_in
UNION ALL
SELECT 'baggage', COUNT(*) FROM baggage
ORDER BY table_name;

-- ============================================================
-- 2. Catalogo de aeropuertos
-- ============================================================
-- Esta consulta muestra los aeropuertos disponibles para busqueda.

SELECT
    code,
    airport_name,
    city,
    country
FROM airport
ORDER BY country, city, airport_name;

-- ============================================================
-- 3. Aviones con cantidad de asientos registrados
-- ============================================================
-- Esta consulta valida que cada avion tenga sus asientos cargados.

SELECT
    p.plate,
    p.model,
    p.capacity,
    COUNT(s.seat_number) AS registered_seats
FROM plane p
LEFT JOIN seat s
    ON s.plane_plate = p.plate
GROUP BY p.plate, p.model, p.capacity
ORDER BY p.plate;

-- ============================================================
-- 4. Busqueda de vuelos por origen y destino
-- ============================================================
-- Ejemplo: buscar vuelos desde San Jose hacia Ciudad de Panama.
-- Esta seria una consulta parecida a la que usaria la vista de reservaciones.

SELECT
    f.flight_id,
    origin.city AS origin_city,
    origin.country AS origin_country,
    destination.city AS destination_city,
    destination.country AS destination_country,
    f.departure_datetime,
    f.arrival_datetime,
    f.state,
    f.gate,
    f.plane_plate
FROM flight f
JOIN airport origin
    ON origin.airport_name = f.airport_departs_from_id
JOIN airport destination
    ON destination.airport_name = f.airport_arrives_to_id
WHERE origin.city = 'San Jose'
  AND destination.city = 'Ciudad de Panama'
ORDER BY f.departure_datetime;

-- ============================================================
-- 5. Itinerarios disponibles con vuelos incluidos
-- ============================================================
-- Esta consulta muestra las rutas vendibles.
-- Un itinerario puede tener un vuelo directo o varios vuelos con escala.

SELECT
    i.itinerary_id,
    i.price,
    ifl.flight_order,
    f.flight_id,
    origin.city AS departs_from,
    destination.city AS arrives_to,
    f.departure_datetime,
    f.arrival_datetime,
    f.state
FROM itinerary i
JOIN flight_in_itinerary ifl
    ON ifl.itinerary_id = i.itinerary_id
JOIN flight f
    ON f.flight_id = ifl.flight_id
JOIN airport origin
    ON origin.airport_name = f.airport_departs_from_id
JOIN airport destination
    ON destination.airport_name = f.airport_arrives_to_id
ORDER BY i.itinerary_id, ifl.flight_order;

-- ============================================================
-- 6. Promociones con precio final calculado
-- ============================================================
-- Esta consulta muestra el precio original, descuento y precio con promocion.

SELECT
    p.promotion_code,
    p.start_date,
    p.end_date,
    p.discount_percent,
    i.itinerary_id,
    i.price AS original_price,
    p.promo_price AS promotional_price,
    CASE
        WHEN CURRENT_DATE BETWEEN p.start_date AND p.end_date THEN 'ACTIVE'
        WHEN CURRENT_DATE < p.start_date THEN 'FUTURE'
        ELSE 'EXPIRED'
    END AS promotion_status
FROM promotion p
JOIN itinerary i
    ON i.itinerary_id = p.itinerary_id
ORDER BY p.start_date, p.promotion_code;

-- ============================================================
-- 7. Reservaciones con informacion del cliente
-- ============================================================
-- Esta consulta permite revisar quien hizo cada reservacion y su estado.

SELECT
    r.reservation_id,
    r.state AS reservation_state,
    r.payment_reference,
    u.email,
    CONCAT(u.name, ' ', u.last_name) AS customer_name,
    p.passport_id,
    CONCAT(p.name, ' ', p.Lname) AS passenger_name,
    i.itinerary_id,
    i.price
FROM reservation r
JOIN app_user u
    ON u.email = r.user_email
JOIN passenger p
    ON p.passport_id = r.passenger_id
JOIN itinerary i
    ON i.itinerary_id = r.itinerary_id
ORDER BY r.reservation_id;

-- ============================================================
-- 8. Pase de abordar: check-in con asiento, puerta y vuelo
-- ============================================================
-- Esta consulta resume la informacion que podria imprimirse en un pase de abordar.

SELECT
    c.confirmation_number,
    p.passport_id,
    CONCAT(p.name, ' ', p.Lname) AS passenger_name,
    f.flight_id,
    origin.city AS origin_city,
    destination.city AS destination_city,
    f.gate,
    f.departure_datetime,
    c.plane_plate,
    c.seat_number
FROM check_in c
JOIN reservation r
    ON r.reservation_id = c.reservation_id
JOIN passenger p
    ON p.passport_id = r.passenger_id
JOIN flight_in_itinerary ifl
    ON ifl.itinerary_flight_id = c.itinerary_flight_id
JOIN flight f
    ON f.flight_id = ifl.flight_id
JOIN airport origin
    ON origin.airport_name = f.airport_departs_from_id
JOIN airport destination
    ON destination.airport_name = f.airport_arrives_to_id
ORDER BY c.confirmation_number;

-- ============================================================
-- 9. Maletas por pasajero y cobro adicional
-- ============================================================
-- Regla del proyecto:
--   Primera maleta: gratis.
--   Segunda maleta: 50 dolares.
--   Tercera maleta en adelante: 75 dolares cada una.

SELECT
    c.confirmation_number,
    p.passport_id,
    CONCAT(p.name, ' ', p.Lname) AS passenger_name,
    COUNT(b.bag_number) AS baggage_count,
    CASE
        WHEN COUNT(b.bag_number) <= 1 THEN 0
        WHEN COUNT(b.bag_number) = 2 THEN 50
        ELSE 50 + ((COUNT(b.bag_number) - 2) * 75)
    END AS extra_baggage_fee
FROM check_in c
JOIN reservation r
    ON r.reservation_id = c.reservation_id
JOIN passenger p
    ON p.passport_id = r.passenger_id
LEFT JOIN baggage b
    ON b.confirmation_number = c.confirmation_number
GROUP BY c.confirmation_number, p.passport_id, p.name, p.Lname
ORDER BY c.confirmation_number;

-- ============================================================
-- 10. Detalle de maletas registradas
-- ============================================================
-- Esta consulta muestra cada maleta con su peso y color.

SELECT
    b.bag_number,
    b.confirmation_number,
    p.passport_id,
    CONCAT(p.name, ' ', p.Lname) AS passenger_name,
    b.weight,
    b.color
FROM baggage b
JOIN check_in c
    ON c.confirmation_number = b.confirmation_number
JOIN reservation r
    ON r.reservation_id = c.reservation_id
JOIN passenger p
    ON p.passport_id = r.passenger_id
ORDER BY b.confirmation_number, b.bag_number;

-- ============================================================
-- 11. Ocupacion por vuelo segun check-ins
-- ============================================================
-- Esta consulta compara asientos ocupados contra capacidad del avion.

SELECT
    f.flight_id,
    f.plane_plate,
    p.model,
    p.capacity,
    COUNT(c.confirmation_number) AS checked_in_passengers,
    p.capacity - COUNT(c.confirmation_number) AS available_seats
FROM flight f
JOIN plane p
    ON p.plate = f.plane_plate
LEFT JOIN flight_in_itinerary ifl
    ON ifl.flight_id = f.flight_id
LEFT JOIN check_in c
    ON c.itinerary_flight_id = ifl.itinerary_flight_id
GROUP BY f.flight_id, f.plane_plate, p.model, p.capacity
ORDER BY f.flight_id;

-- ============================================================
-- 12. Estudiantes y millas acumuladas
-- ============================================================
-- Esta consulta muestra los clientes estudiantes del programa de lealtad.

SELECT
    u.email,
    CONCAT(u.name, ' ', u.last_name) AS student_name,
    s.user_carnet,
    s.college_name,
    s.miles
FROM student s
JOIN app_user u
    ON u.email = s.user_email
ORDER BY s.miles DESC;
