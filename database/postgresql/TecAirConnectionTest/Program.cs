// Creation command on postgresql/ : dotnet new console -n TecAirConnectionTest -f net9.0
// Add package: dotnet add package Npgsql
// Compilation command: dontet build
// Run command: dotnet run
using Npgsql;

// ============================================================
// Header principal del programa
// ============================================================
// Esta aplicacion de consola prueba la comunicacion basica:
// C# -> Npgsql -> PostgreSQL -> Base de datos TECAir.

Console.WriteLine("==========================================");
Console.WriteLine("TECAir - Prueba de conexion C# PostgreSQL");
Console.WriteLine("==========================================");
Console.WriteLine();

// ============================================================
// Configuracion de conexion
// ============================================================
// Estos valores indican donde esta PostgreSQL y a que base conectarse.
// Search Path=tecair se agrega mas abajo para usar directamente las tablas
// del esquema tecair sin escribir tecair.nombre_tabla en cada consulta.

const string host = "localhost";
const int port = 5432;
const string database = "tecair_test_db";
const string username = "postgres";

// La contrasena se pide en consola para no dejarla escrita dentro del codigo.
Console.Write("Password de PostgreSQL para el usuario postgres: ");
string password = ReadPassword();
Console.WriteLine();
Console.WriteLine();

var connectionString =
    $"Host={host};Port={port};Database={database};Username={username};Password={password};Search Path=tecair";

// ============================================================
// Apertura de conexion y ejecucion de consultas
// ============================================================
// Aqui se abre la conexion con PostgreSQL.
// Si conecta correctamente, se ejecutan varias consultas de demostracion.

try
{
    await using var connection = new NpgsqlConnection(connectionString);
    await connection.OpenAsync();

    Console.WriteLine("Conexion exitosa con PostgreSQL.");
    Console.WriteLine();

    await PrintDatabaseVersion(connection);
    await PrintTableSummary(connection);
    await PrintAirports(connection);
    await PrintFlights(connection);
    await PrintPromotions(connection);
    await PrintBaggageFees(connection);
}
catch (Exception ex)
{
    Console.WriteLine("No se pudo conectar o consultar la base de datos.");
    Console.WriteLine();
    Console.WriteLine("Detalle tecnico:");
    Console.WriteLine(ex.Message);
    Console.WriteLine();
    Console.WriteLine("Revisa estas cosas:");
    Console.WriteLine("1. PostgreSQL debe estar encendido como servicio de Windows.");
    Console.WriteLine("2. La base debe llamarse tecair_test_db.");
    Console.WriteLine("3. Deben haberse ejecutado 01_create_schema.sql y 02_seed_data.sql.");
    Console.WriteLine("4. La contrasena del usuario postgres debe ser correcta.");
}

// ============================================================
// Consulta 1: version del servidor PostgreSQL
// ============================================================
// ExecuteScalarAsync se usa cuando se espera un unico valor como resultado.

static async Task PrintDatabaseVersion(NpgsqlConnection connection)
{
    await using var command = new NpgsqlCommand("SELECT version();", connection);
    var version = await command.ExecuteScalarAsync();

    Console.WriteLine("Version del servidor:");
    Console.WriteLine(version);
    Console.WriteLine();
}

// ============================================================
// Consulta 2: resumen de tablas
// ============================================================
// Esta consulta cuenta filas en varias tablas para verificar que el seed
// de datos se ejecuto correctamente.

static async Task PrintTableSummary(NpgsqlConnection connection)
{
    const string sql = """
        SELECT 'app_user' AS table_name, COUNT(*) AS total_rows FROM app_user
        UNION ALL
        SELECT 'airport', COUNT(*) FROM airport
        UNION ALL
        SELECT 'plane', COUNT(*) FROM plane
        UNION ALL
        SELECT 'flight', COUNT(*) FROM flight
        UNION ALL
        SELECT 'itinerary', COUNT(*) FROM itinerary
        UNION ALL
        SELECT 'promotion', COUNT(*) FROM promotion
        UNION ALL
        SELECT 'reservation', COUNT(*) FROM reservation
        UNION ALL
        SELECT 'check_in', COUNT(*) FROM check_in
        UNION ALL
        SELECT 'baggage', COUNT(*) FROM baggage
        ORDER BY table_name;
        """;

    Console.WriteLine("Resumen de tablas:");

    // NpgsqlCommand representa la consulta SQL que se enviara a PostgreSQL.
    await using var command = new NpgsqlCommand(sql, connection);

    // ExecuteReaderAsync se usa cuando la consulta devuelve varias filas.
    await using var reader = await command.ExecuteReaderAsync();

    // ReadAsync avanza fila por fila sobre el resultado de la consulta.
    while (await reader.ReadAsync())
    {
        Console.WriteLine($"- {reader.GetString(0),-12} {reader.GetInt64(1),3} filas");
    }

    Console.WriteLine();
}

// ============================================================
// Consulta 3: aeropuertos cargados
// ============================================================
// Esta consulta muestra los aeropuertos disponibles para busqueda de vuelos.

static async Task PrintAirports(NpgsqlConnection connection)
{
    const string sql = """
        SELECT airport_id, airport_name, city, country
        FROM airport
        ORDER BY country, city;
        """;

    Console.WriteLine("Aeropuertos cargados:");
    await using var command = new NpgsqlCommand(sql, connection);
    await using var reader = await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        Console.WriteLine(
            $"- #{reader.GetInt32(0)} | {reader.GetString(2)}, {reader.GetString(3)} | {reader.GetString(1)}");
    }

    Console.WriteLine();
}

// ============================================================
// Consulta 4: vuelos disponibles
// ============================================================
// Esta consulta une flight con airport dos veces:
// una para obtener el aeropuerto de origen y otra para el destino.

static async Task PrintFlights(NpgsqlConnection connection)
{
    const string sql = """
        SELECT
            f.flight_id,
            origin.city AS origin_city,
            destination.city AS destination_city,
            f.departure_datetime,
            f.arrival_datetime,
            f.state,
            f.gate
        FROM flight f
        JOIN airport origin
            ON origin.airport_id = f.airport_departs_from_id
        JOIN airport destination
            ON destination.airport_id = f.airport_arrives_to_id
        ORDER BY f.departure_datetime;
        """;

    Console.WriteLine("Vuelos disponibles:");
    await using var command = new NpgsqlCommand(sql, connection);
    await using var reader = await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        Console.WriteLine(
            $"- Vuelo {reader.GetInt32(0)} | {reader.GetString(1)} -> {reader.GetString(2)} | " +
            $"{reader.GetDateTime(3):yyyy-MM-dd HH:mm} | Estado: {reader.GetString(5)} | Puerta: {reader.GetString(6)}");
    }

    Console.WriteLine();
}

// ============================================================
// Consulta 5: promociones con precio final
// ============================================================
// Esta consulta une promotion con itinerary y calcula el precio final
// aplicando el porcentaje de descuento.

static async Task PrintPromotions(NpgsqlConnection connection)
{
    const string sql = """
        SELECT
            p.promotion_code,
            i.price AS original_price,
            p.discount_percent,
            ROUND(i.price * (1 - (p.discount_percent / 100)), 2) AS promotional_price
        FROM promotion p
        JOIN itinerary i
            ON i.itinerary_id = p.itinerary_id
        ORDER BY p.promotion_code;
        """;

    Console.WriteLine("Promociones:");
    await using var command = new NpgsqlCommand(sql, connection);
    await using var reader = await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        Console.WriteLine(
            $"- {reader.GetString(0)} | Precio original: ${reader.GetDecimal(1):0.00} | " +
            $"Descuento: {reader.GetDecimal(2):0.##}% | Precio final: ${reader.GetDecimal(3):0.00}");
    }

    Console.WriteLine();
}

// ============================================================
// Consulta 6: cobro adicional por maletas
// ============================================================
// Esta consulta agrupa maletas por confirmation_number y aplica la regla:
// primera maleta gratis, segunda 50, tercera en adelante 75 cada una.

static async Task PrintBaggageFees(NpgsqlConnection connection)
{
    const string sql = """
        SELECT
            confirmation_number,
            COUNT(*) AS baggage_count,
            CASE
                WHEN COUNT(*) <= 1 THEN 0
                WHEN COUNT(*) = 2 THEN 50
                ELSE 50 + ((COUNT(*) - 2) * 75)
            END AS extra_baggage_fee
        FROM baggage
        GROUP BY confirmation_number
        ORDER BY confirmation_number;
        """;

    Console.WriteLine("Cobro adicional por maletas:");
    await using var command = new NpgsqlCommand(sql, connection);
    await using var reader = await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        Console.WriteLine(
            $"- {reader.GetString(0)} | Maletas: {reader.GetInt64(1)} | Cobro extra: ${reader.GetInt32(2)}");
    }

    Console.WriteLine();
}

// ============================================================
// Helper: lectura segura de contrasena
// ============================================================
// Lee la contrasena sin mostrar el texto real en consola.
// En pantalla solo se imprimen asteriscos.

static string ReadPassword()
{
    var password = string.Empty;
    ConsoleKeyInfo key;

    while ((key = Console.ReadKey(intercept: true)).Key != ConsoleKey.Enter)
    {
        if (key.Key == ConsoleKey.Backspace && password.Length > 0)
        {
            password = password[..^1];
            Console.Write("\b \b");
            continue;
        }

        if (!char.IsControl(key.KeyChar))
        {
            password += key.KeyChar;
            Console.Write("*");
        }
    }

    return password;
}
