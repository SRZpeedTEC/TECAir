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
    first_name VARCHAR(80) NOT NULL,
    middle_initial CHAR(1),
    last_name VARCHAR(80) NOT NULL,
    phone_number VARCHAR(25) NOT NULL,
    role VARCHAR(20) NOT NULL,

    -- Esto limita el rol del usuario a valores conocidos por el sistema.
    CONSTRAINT ck_app_user_role
        CHECK (role IN ('CLIENT', 'ADMIN'))
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
        CHECK (miles >= 0)
);

-- =========================
-- Aeropuertos, aviones y asientos
-- =========================

-- Esta tabla guarda los aeropuertos disponibles para rutas y vuelos.
CREATE TABLE airport (
    airport_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    airport_name VARCHAR(120) NOT NULL,
    city VARCHAR(80) NOT NULL,
    country VARCHAR(80) NOT NULL,

    -- Esto evita registrar dos veces el mismo aeropuerto en la misma ciudad y pais.
    CONSTRAINT uq_airport_location
        UNIQUE (airport_name, city, country)
);

-- Esta tabla guarda los aviones de la aerolinea.
-- La matricula del avion se usa como identificador unico.
CREATE TABLE plane (
    plate VARCHAR(20) PRIMARY KEY,
    model VARCHAR(80) NOT NULL,
    capacity INTEGER NOT NULL,

    -- Esto evita registrar aviones con capacidad cero o negativa.
    CONSTRAINT ck_plane_capacity
        CHECK (capacity > 0)
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
        ON DELETE CASCADE
);

-- =========================
-- Vuelos e itinerarios
-- =========================

-- Esta tabla guarda vuelos individuales.
-- Un vuelo tiene avion, aeropuerto de salida, aeropuerto de llegada, estado, puerta y horarios.
CREATE TABLE flight (
    flight_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plane_plate VARCHAR(20) NOT NULL,
    airport_departs_from_id INTEGER NOT NULL,
    airport_arrives_to_id INTEGER NOT NULL,
    state VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
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
        REFERENCES airport (airport_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Esto relaciona flight con airport: indica el aeropuerto al que llega el vuelo.
    CONSTRAINT fk_flight_arrival_airport
        FOREIGN KEY (airport_arrives_to_id)
        REFERENCES airport (airport_id)
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
        CHECK (state IN ('SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED'))
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
CREATE TABLE itinerary_flight (
    itinerary_flight_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    itinerary_id INTEGER NOT NULL,
    flight_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL,
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

    -- Esto evita que dos vuelos ocupen la misma posicion dentro del mismo itinerario.
    CONSTRAINT uq_itinerary_flight_order
        UNIQUE (itinerary_id, flight_order),

    -- Esto evita repetir el mismo vuelo dentro del mismo itinerario.
    CONSTRAINT uq_itinerary_flight
        UNIQUE (itinerary_id, flight_id),

    -- Esto obliga a que el orden de los vuelos empiece en numeros positivos.
    CONSTRAINT ck_itinerary_flight_order
        CHECK (flight_order > 0),

    -- Esto clasifica si el vuelo es parte de una ruta directa o una conexion.
    CONSTRAINT ck_itinerary_flight_type
        CHECK (type IN ('DIRECT', 'CONNECTION'))
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
        CHECK (discount_percent > 0 AND discount_percent <= 100)
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
    state VARCHAR(20) NOT NULL DEFAULT 'PENDING_PAYMENT',
    number_of_people INTEGER NOT NULL DEFAULT 1,
    payment_reference VARCHAR(120),

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

    -- Esto evita reservaciones con cero personas o cantidades negativas.
    CONSTRAINT ck_reservation_people
        CHECK (number_of_people > 0),

    -- Esto limita el estado de la reservacion a valores esperados por el sistema.
    CONSTRAINT ck_reservation_state
        CHECK (state IN ('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'CHECKED_IN'))
);

-- Esta tabla guarda el check-in de un pasajero para un vuelo dentro de una reservacion.
-- Aqui tambien se asigna el asiento que apareceria en el pase de abordar.
CREATE TABLE check_in (
    confirmation_number VARCHAR(40) PRIMARY KEY,
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
        REFERENCES itinerary_flight (itinerary_flight_id)
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
        UNIQUE (itinerary_flight_id, plane_plate, seat_number)
);

-- Esta tabla guarda las maletas asociadas a un pasajero que ya hizo check-in.
CREATE TABLE baggage (
    bag_number VARCHAR(40) PRIMARY KEY,
    confirmation_number VARCHAR(40) NOT NULL,
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
        CHECK (weight > 0)
);

COMMIT;
