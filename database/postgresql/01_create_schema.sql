-- TECAir - Script de creacion de tablas
-- PostgreSQL
--
-- Este script crea la estructura vacia de la base de datos:
-- tablas, llaves primarias, llaves foraneas y restricciones basicas.

BEGIN;

CREATE SCHEMA IF NOT EXISTS tecair;
SET search_path TO tecair;

-- =========================
-- Usuarios
-- =========================

-- Esta tabla guarda a todos los usuarios del sistema: clientes, funcionarios y administradores.
-- El correo se usa como identificador unico del usuario.
CREATE TABLE app_user (
    email VARCHAR(120) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    phone_number VARCHAR(25) NOT NULL,
    role VARCHAR(20) NOT NULL,

    -- Esto limita el rol del usuario a valores conocidos por el sistema.
    CONSTRAINT ck_app_user_role
        CHECK (role IN ('CLIENT', 'ADMIN')),

    -- Valor único de telefono
    CONSTRAINT uq_app_user_phone
        UNIQUE (phone_number),

    -- Verifica formato de email
    CONSTRAINT ck_app_user_email_format
        CHECK (email = LOWER(email) AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),

    -- Verifica que name y last_name no sean nulos
    CONSTRAINT ck_app_user_names_not_blank
        CHECK (TRIM(name) <> '' AND TRIM(last_name) <> ''),

    -- Esto verifica que el numero de telefono no sea nulo
    CONSTRAINT ck_app_user_phone_not_blank
        CHECK (TRIM(phone_number) <> '')
);

-- Esta tabla guarda pasajeros 
-- El identificador del passaporte funciona como primary key
CREATE TABLE passenger (
    passport_id VARCHAR(120) PRIMARY KEY,
    birthday TIMESTAMP NOT NULL,
    gender VARCHAR(80) NOT NULL,
    name VARCHAR(80) NOT NULL,
    Lname VARCHAR(80) NOT NULL,

    -- Esto limita el genero a 3 valores conocidos
    CONSTRAINT ck_passenger_gender
        CHECK (gender IN ('FEMALE', 'MALE', 'OTHER')),

    -- Verifica que name y Lname no sean nulos
    CONSTRAINT ck_passenger_names_not_blank
        CHECK (TRIM(name) <> '' AND TRIM(Lname) <> ''),

    -- Verifica que el pasaporte no sea nulo
    CONSTRAINT ck_passenger_passport_not_blank
        CHECK (TRIM(passport_id) <> '')
);

-- Esta tabla guarda la informacion adicional de los usuarios que tambien son estudiantes.
-- Un estudiante siempre debe existir primero como usuario en app_user.
CREATE TABLE student (
    user_email VARCHAR(120) PRIMARY KEY,
    user_carnet VARCHAR(40) NOT NULL UNIQUE,
    college_name VARCHAR(120) NOT NULL,
    miles INTEGER NOT NULL DEFAULT 0,

    -- Esto relaciona student con app_user: cada estudiante pertenece a un usuario.
    -- Si se borra un usuario, tambien se borra su informacion de estudiante.
    CONSTRAINT fk_student_user
        FOREIGN KEY (user_email)
        REFERENCES app_user (email)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    -- Esto evita que un estudiante tenga millas negativas.
    CONSTRAINT ck_student_miles
        CHECK (miles >= 0),

    -- Esto evita que el carnet sae nulo
    CONSTRAINT ck_student_carnet_not_blank
        CHECK (TRIM(user_carnet) <> ''),

    -- Esto evita que el nombre de College sea nulo
    CONSTRAINT ck_student_college_not_blank
        CHECK (TRIM(college_name) <> '')
);

-- =========================
-- Aeropuertos, aviones y asientos
-- =========================

-- Esta tabla guarda los aeropuertos disponibles para rutas y vuelos.
CREATE TABLE airport (
    code VARCHAR(20) PRIMARY KEY,
    airport_name VARCHAR(120) NOT NULL,
    city VARCHAR(80) NOT NULL,
    country VARCHAR(80) NOT NULL,

    -- Esto evita registrar dos veces el mismo aeropuerto en la misma ciudad y pais.
    CONSTRAINT uq_airport_location
        UNIQUE (airport_name, city, country),

    -- Esto evita que el formato ingresado no sea el esperado de 3 letras mayúsculas
    CONSTRAINT ck_airport_code_format
        CHECK (code = UPPER(code) AND code ~ '^[A-Z]{3}$'),

    -- Esto evita que el nombre, ciudad y país sean nulos
    CONSTRAINT ck_airport_text_not_blank
        CHECK (TRIM(airport_name) <> '' AND TRIM(city) <> '' AND TRIM(country) <> '')
);

-- Esta tabla guarda los aviones de la aerolinea.
-- La matricula del avion se usa como identificador unico.
CREATE TABLE plane (
    plate VARCHAR(20) PRIMARY KEY,
    model VARCHAR(80) NOT NULL,
    capacity INTEGER NOT NULL,

    -- Esto evita registrar aviones con capacidad cero o negativa.
    CONSTRAINT ck_plane_capacity
        CHECK (capacity > 0),

    -- Esto evita palte y modelo vacíos
    CONSTRAINT ck_plane_text_not_blank
        CHECK (TRIM(plate) <> '' AND TRIM(model) <> '')
);

-- Esta tabla guarda los asientos de cada avion.
-- La llave primaria combina avion + numero de asiento, porque distintos aviones pueden tener un asiento 1A.
CREATE TABLE seat (
    plane_plate VARCHAR(20) NOT NULL,
    seat_number VARCHAR(10) NOT NULL,

    -- Esto identifica de forma unica cada asiento dentro de un avion especifico.
    CONSTRAINT pk_seat
        PRIMARY KEY (plane_plate, seat_number),

    -- Esto relaciona seat con plane: cada asiento pertenece a un avion.
    -- Si se borra un avion, tambien se borran sus asientos.
    CONSTRAINT fk_seat_plane
        FOREIGN KEY (plane_plate)
        REFERENCES plane (plate)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    -- Formato de asientos ejemplos 9Z - 8A
    CONSTRAINT ck_seat_number_format
        CHECK (seat_number ~ '^[0-9]+[A-Z]$')
);

-- =========================
-- Vuelos e itinerarios
-- =========================

-- Esta tabla guarda vuelos individuales.
-- Un vuelo tiene avion, aeropuerto de salida, aeropuerto de llegada, estado, puerta y horarios.
CREATE TABLE flight (
    flight_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plane_plate VARCHAR(20) NOT NULL,
    airport_departs_from_id VARCHAR(20) NOT NULL,
    airport_arrives_to_id VARCHAR(20) NOT NULL,
    state VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    gate VARCHAR(10),
    departure_datetime TIMESTAMP NOT NULL,
    arrival_datetime TIMESTAMP NOT NULL,

    -- Esto relaciona flight con plane: cada vuelo usa un avion existente.
    -- No permite borrar un avion si ya esta asociado a vuelos.
    CONSTRAINT fk_flight_plane
        FOREIGN KEY (plane_plate)
        REFERENCES plane (plate)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Esto relaciona flight con airport: indica el aeropuerto desde donde sale el vuelo.
    CONSTRAINT fk_flight_departure_airport
        FOREIGN KEY (airport_departs_from_id)
        REFERENCES airport (code)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Esto relaciona flight con airport: indica el aeropuerto al que llega el vuelo.
    CONSTRAINT fk_flight_arrival_airport
        FOREIGN KEY (airport_arrives_to_id)
        REFERENCES airport (code)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Esto evita crear vuelos cuyo origen y destino sean el mismo aeropuerto.
    CONSTRAINT ck_flight_different_airports
        CHECK (airport_departs_from_id <> airport_arrives_to_id),

    -- Esto valida que la llegada ocurra despues de la salida.
    CONSTRAINT ck_flight_datetime_order
        CHECK (arrival_datetime > departure_datetime),

    -- Esto limita el estado del vuelo a valores controlados por el sistema.
    CONSTRAINT ck_flight_state
        CHECK (state IN ('OPEN', 'CLOSED')),

    -- Esto evita que gate sea nulo
    CONSTRAINT ck_flight_gate_not_blank
        CHECK (gate IS NULL OR TRIM(gate) <> '')
);

-- Esta tabla representa una ruta vendible para el cliente.
-- Un itinerario puede estar formado por uno o varios vuelos.
CREATE TABLE itinerary (
    itinerary_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    price NUMERIC(10, 2) NOT NULL,

    -- Esto evita itinerarios con precio negativo.
    CONSTRAINT ck_itinerary_price
        CHECK (price >= 0)
);

-- Esta tabla une itinerarios con vuelos.
-- Sirve para que un itinerario tenga un vuelo directo o varios vuelos con escalas.
CREATE TABLE flight_in_itinerary (
    itinerary_flight_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    itinerary_id INTEGER NOT NULL,
    flight_id INTEGER NOT NULL,
    flight_order INTEGER NOT NULL,

    -- Esto relaciona itinerary_flight con itinerary: indica a que itinerario pertenece el vuelo.
    -- Si se borra un itinerario, se borran sus relaciones con vuelos.
    CONSTRAINT fk_itinerary_flight_itinerary
        FOREIGN KEY (itinerary_id)
        REFERENCES itinerary (itinerary_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    -- Esto relaciona itinerary_flight con flight: indica que vuelo forma parte del itinerario.
    CONSTRAINT fk_itinerary_flight_flight
        FOREIGN KEY (flight_id)
        REFERENCES flight (flight_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Esto evita repetir el mismo vuelo dentro del mismo itinerario.
    CONSTRAINT uq_itinerary_flight
        UNIQUE (itinerary_id, flight_id)

);

-- =========================
-- Promociones
-- =========================

-- Esta tabla guarda promociones aplicadas a itinerarios especificos.
CREATE TABLE promotion (
    promotion_code VARCHAR(30) PRIMARY KEY,
    itinerary_id INTEGER NOT NULL,
    image_url VARCHAR(500),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    discount_percent NUMERIC(5, 2) NOT NULL,
    promo_price INTEGER NOT NULL,

    -- Esto relaciona promotion con itinerary: cada promocion aplica a un itinerario existente.
    -- Si se borra el itinerario, tambien se borran sus promociones.
    CONSTRAINT fk_promotion_itinerary
        FOREIGN KEY (itinerary_id)
        REFERENCES itinerary (itinerary_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    -- Esto valida que la fecha final de la promocion no sea anterior a la fecha inicial.
    CONSTRAINT ck_promotion_dates
        CHECK (end_date >= start_date),

    -- Esto valida que el descuento sea mayor que 0 y como maximo 100 por ciento.
    CONSTRAINT ck_promotion_discount
        CHECK (discount_percent > 0 AND discount_percent <= 100),

    -- Esto evita que el precio sea cero o negativo
    CONSTRAINT ck_promotion_price
        CHECK (promo_price >= 0),

    -- Esto evita que el codigo de promoción sea nulo
    CONSTRAINT ck_promotion_code_not_blank
        CHECK (TRIM(promotion_code) <> '')
);

-- =========================
-- Reservaciones, check-in y maletas
-- =========================

-- Esta tabla guarda las reservaciones realizadas por los usuarios.
-- Una reservacion pertenece a un usuario y a un itinerario.
CREATE TABLE reservation (
    reservation_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    itinerary_id INTEGER NOT NULL,
    user_email VARCHAR(120) NOT NULL,
    state VARCHAR(20) NOT NULL DEFAULT 'PAID',
    payment_reference VARCHAR(120),
    passenger_id VARCHAR(120),
    plane_plate VARCHAR(20),
    seat_number VARCHAR(10),

    -- Esto relaciona reservation con itinerary: indica que ruta esta reservando el usuario.
    CONSTRAINT fk_reservation_itinerary
        FOREIGN KEY (itinerary_id)
        REFERENCES itinerary (itinerary_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Esto relaciona reservation con app_user: indica que usuario hizo la reservacion.
    CONSTRAINT fk_reservation_user
        FOREIGN KEY (user_email)
        REFERENCES app_user (email)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Esto relaciona reservation con passenger: indica el pasaporte del passenger.
    CONSTRAINT fk_reservation_passenger
        FOREIGN KEY (passenger_id)
        REFERENCES passenger (passport_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    
    -- El asiento asignado debe existir en el avion indicado.
    CONSTRAINT fk_reservation_seat
        FOREIGN KEY (plane_plate, seat_number)
        REFERENCES seat (plane_plate, seat_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Esto limita el estado de la reservacion a valores esperados por el sistema.
    CONSTRAINT ck_reservation_state
        CHECK (state IN ('PAID', 'CHECKED')),

    CONSTRAINT uq_reservation_payment_reference
        UNIQUE (payment_reference)
);

-- Esta tabla guarda el check-in de un pasajero para un vuelo dentro de una reservacion.
-- Aqui tambien se asigna el asiento que apareceria en el pase de abordar.
CREATE TABLE check_in (
    confirmation_number INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id INTEGER NOT NULL,
    itinerary_flight_id INTEGER NOT NULL,
    plane_plate VARCHAR(20) NOT NULL,
    seat_number VARCHAR(10) NOT NULL,

    -- Esto relaciona check_in con reservation: cada check-in viene de una reservacion.
    -- Si se borra la reservacion, se borra tambien su check-in.
    CONSTRAINT fk_check_in_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES reservation (reservation_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    -- Esto relaciona check_in con itinerary_flight: indica el vuelo especifico que se esta chequeando.
    CONSTRAINT fk_check_in_itinerary_flight
        FOREIGN KEY (itinerary_flight_id)
        REFERENCES flight_in_itinerary (itinerary_flight_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Esto relaciona check_in con seat: el asiento asignado debe existir en el avion indicado.
    CONSTRAINT fk_check_in_seat
        FOREIGN KEY (plane_plate, seat_number)
        REFERENCES seat (plane_plate, seat_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Esto evita asignar el mismo asiento a dos check-ins del mismo vuelo.
    CONSTRAINT uq_check_in_seat_per_flight
        UNIQUE (itinerary_flight_id, plane_plate, seat_number),

    -- Esto evita tener más de un itinerary_flight asociado a una reservación.
    CONSTRAINT uq_check_in_reservation_flight
        UNIQUE (reservation_id, itinerary_flight_id)

);

-- Esta tabla guarda las maletas asociadas a un pasajero que ya hizo check-in.
-- NOTA: NUMERIC(6, 2) indica que puede tener 6 digitos en unidades y 2 decimales ej: 1234,12 
CREATE TABLE baggage (
    bag_number INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    confirmation_number INTEGER NOT NULL,
    weight NUMERIC(6, 2) NOT NULL,
    color VARCHAR(40) NOT NULL,

    -- Esto relaciona baggage con check_in: cada maleta pertenece a un check-in existente.
    -- Si se borra el check-in, tambien se borran sus maletas.
    CONSTRAINT fk_baggage_check_in
        FOREIGN KEY (confirmation_number)
        REFERENCES check_in (confirmation_number)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    -- Esto evita registrar maletas con peso cero o negativo.
    CONSTRAINT ck_baggage_weight
        CHECK (weight > 0 AND weight <= 32)

);

COMMIT;
