-- TECAir - Script de creacion de base de datos
-- PostgreSQL
--
-- Este script crea la base de datos vacia para el proyecto.
--
-- Instrucciones:
-- 1. Ejecutar este script conectado a la base administrativa postgres.
-- 2. Luego conectarse a tecair_test_db.
-- 3. Ejecutar 01_create_schema.sql.
-- 4. Ejecutar 02_seed_data.sql.
-- 5. Ejecutar 03_visualization.sql solo si se quieren consultas de ejemplo.
--
-- Nota:
-- CREATE DATABASE no debe ejecutarse dentro de una transaccion.
-- Si la base ya existe, PostgreSQL mostrara un error y no la recreara.

CREATE DATABASE tecair_test_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    TEMPLATE = template0;
