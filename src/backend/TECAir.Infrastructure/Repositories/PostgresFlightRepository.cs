using Npgsql;
using NpgsqlTypes;
using TECAir.Application.DTOs.Flights;
using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Repositories;

// Repositorio encargado de consultar y modificar vuelos en PostgreSQL con Npgsql.
// Mantiene el SQL fuera de controllers y servicios, usando siempre parametros.
public sealed class PostgresFlightRepository(NpgsqlDataSource dataSource) : IFlightRepository
{
    // Lista vuelos en orden de salida. Todos los filtros son opcionales.
    public async Task<IReadOnlyList<FlightResponse>> SearchAsync(
        FlightSearchFilters filters,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                flight_id,
                plane_plate,
                airport_departs_from_id,
                airport_arrives_to_id,
                state,
                gate,
                departure_datetime,
                arrival_datetime,
                miles
            FROM tecair.flight
            WHERE
                (@flight_id IS NULL OR flight_id = @flight_id)
                AND (@departure_code IS NULL OR airport_departs_from_id = @departure_code)
                AND (@arrival_code IS NULL OR airport_arrives_to_id = @arrival_code)
                AND (@state IS NULL OR state = @state)
                AND (@departure_date IS NULL OR departure_datetime::DATE = @departure_date)
            ORDER BY departure_datetime ASC, flight_id ASC;
            """;

        var flights = new List<FlightResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.Add("flight_id", NpgsqlDbType.Integer).Value =
            (object?)filters.FlightId ?? DBNull.Value;
        command.Parameters.Add("departure_code", NpgsqlDbType.Varchar).Value =
            (object?)filters.DepartureCode ?? DBNull.Value;
        command.Parameters.Add("arrival_code", NpgsqlDbType.Varchar).Value =
            (object?)filters.ArrivalCode ?? DBNull.Value;
        command.Parameters.Add("state", NpgsqlDbType.Varchar).Value =
            (object?)filters.State ?? DBNull.Value;
        command.Parameters.Add("departure_date", NpgsqlDbType.Date).Value =
            (object?)filters.DepartureDate ?? DBNull.Value;

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            flights.Add(MapFlightResponse(reader));
        }

        return flights;
    }

    // Devuelve un vuelo puntual para consultas por id y reglas de apertura.
    public async Task<FlightResponse?> GetByIdAsync(int flightId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                flight_id,
                plane_plate,
                airport_departs_from_id,
                airport_arrives_to_id,
                state,
                gate,
                departure_datetime,
                arrival_datetime,
                miles
            FROM tecair.flight
            WHERE flight_id = @flight_id;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapFlightResponse(reader);
    }

    public async Task<FlightClosingReportResponse?> GetClosingReportAsync(
        int flightId,
        CancellationToken cancellationToken = default)
    {
        const string flightSql = """
            SELECT
                f.flight_id,
                f.airport_departs_from_id,
                departure_airport.airport_name,
                departure_airport.city,
                f.airport_arrives_to_id,
                arrival_airport.airport_name,
                arrival_airport.city,
                f.departure_datetime,
                f.arrival_datetime,
                f.gate,
                f.plane_plate,
                f.state
            FROM tecair.flight f
            INNER JOIN tecair.airport departure_airport
                ON departure_airport.code = f.airport_departs_from_id
            INNER JOIN tecair.airport arrival_airport
                ON arrival_airport.code = f.airport_arrives_to_id
            WHERE f.flight_id = @flight_id;
            """;

        FlightClosingReportFlight? flight = null;
        await using (var command = dataSource.CreateCommand(flightSql))
        {
            command.Parameters.AddWithValue("flight_id", flightId);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                flight = new FlightClosingReportFlight
                {
                    FlightId = reader.GetInt32(0),
                    DepartureAirportCode = reader.GetString(1),
                    DepartureAirportName = reader.GetString(2),
                    DepartureAirportCity = reader.GetString(3),
                    ArrivalAirportCode = reader.GetString(4),
                    ArrivalAirportName = reader.GetString(5),
                    ArrivalAirportCity = reader.GetString(6),
                    DepartureDatetime = reader.GetDateTime(7),
                    ArrivalDatetime = reader.GetDateTime(8),
                    Gate = reader.IsDBNull(9) ? null : reader.GetString(9),
                    PlanePlate = reader.GetString(10),
                    State = reader.GetString(11)
                };
            }
        }

        if (flight is null)
        {
            return null;
        }

        var itineraries = await GetClosingReportItinerariesAsync(flightId, cancellationToken);
        var passengers = await GetClosingReportPassengersAsync(flightId, cancellationToken);

        return new FlightClosingReportResponse
        {
            Flight = flight,
            Itineraries = itineraries,
            Passengers = passengers
        };
    }

    // Verifica que el aeropuerto exista antes de crear vuelos que lo referencien.
    public async Task<bool> AirportExistsAsync(string airportCode, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.airport
                WHERE code = @code
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("code", airportCode);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Verifica que el avion exista para evitar insertar vuelos con una placa invalida.
    public async Task<bool> PlaneExistsAsync(string planePlate, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.plane
                WHERE plate = @plate
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("plate", planePlate);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Detecta traslapes de tiempo para un mismo avion.
    // La condicion compara rangos: un vuelo existente inicia antes de que termine
    // el nuevo y termina despues de que el nuevo ya inicio.
    public async Task<bool> PlaneHasOverlappingFlightAsync(
        string planePlate,
        DateTime departureDatetime,
        DateTime arrivalDatetime,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight
                WHERE
                    plane_plate = @plane_plate
                    AND departure_datetime < @arrival_datetime
                    AND arrival_datetime > @departure_datetime
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("plane_plate", planePlate);
        command.Parameters.AddWithValue("departure_datetime", departureDatetime);
        command.Parameters.AddWithValue("arrival_datetime", arrivalDatetime);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Detecta si una puerta ya esta reservada para el mismo aeropuerto y hora de salida.
    // LOWER permite comparar la puerta sin depender de mayusculas o minusculas.
    public async Task<bool> GateHasDepartureConflictAsync(
        string airportDepartsFromId,
        string gate,
        DateTime departureDatetime,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight
                WHERE
                    airport_departs_from_id = @airport_departs_from_id
                    AND LOWER(gate) = LOWER(@gate)
                    AND departure_datetime = @departure_datetime
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("airport_departs_from_id", airportDepartsFromId);
        command.Parameters.AddWithValue("gate", gate);
        command.Parameters.AddWithValue("departure_datetime", departureDatetime);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Detecta la regla de margen de puerta: la misma puerta no puede tener
    // otra salida en el mismo aeropuerto durante la hora previa.
    public async Task<bool> GateHasDepartureWithinPreviousHourAsync(
        string airportDepartsFromId,
        string gate,
        DateTime departureDatetime,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight
                WHERE
                    airport_departs_from_id = @airport_departs_from_id
                    AND LOWER(gate) = LOWER(@gate)
                    AND departure_datetime >= @departure_datetime - INTERVAL '1 hour'
                    AND departure_datetime < @departure_datetime
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("airport_departs_from_id", airportDepartsFromId);
        command.Parameters.AddWithValue("gate", gate);
        command.Parameters.AddWithValue("departure_datetime", departureDatetime);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Inserta el vuelo y devuelve la fila creada con el formato que usa la API.
    public async Task<FlightResponse> CreateAsync(
        CreateFlightRequest request,
        DateTime calculatedArrivalDatetime,
        int calculatedMiles,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO tecair.flight (
                plane_plate,
                airport_departs_from_id,
                airport_arrives_to_id,
                state,
                gate,
                departure_datetime,
                arrival_datetime,
                miles
            )
            VALUES (
                @plane_plate,
                @airport_departs_from_id,
                @airport_arrives_to_id,
                @state,
                @gate,
                @departure_datetime,
                @arrival_datetime,
                @miles
            )
            RETURNING
                flight_id,
                plane_plate,
                airport_departs_from_id,
                airport_arrives_to_id,
                state,
                gate,
                departure_datetime,
                arrival_datetime,
                miles;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("plane_plate", request.PlanePlate);
        command.Parameters.AddWithValue("airport_departs_from_id", request.AirportDepartsFromId);
        command.Parameters.AddWithValue("airport_arrives_to_id", request.AirportArrivesToId);
        command.Parameters.AddWithValue("state", request.State);
        command.Parameters.AddWithValue("gate", (object?)request.Gate ?? DBNull.Value);
        command.Parameters.AddWithValue("departure_datetime", request.DepartureDatetime);
        command.Parameters.AddWithValue("arrival_datetime", calculatedArrivalDatetime);
        command.Parameters.AddWithValue("miles", calculatedMiles);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("Failed to create the flight.");
        }

        return MapFlightResponse(reader);
    }

    // Lista vuelos en un estado dado para un aeropuerto de salida. El estado y
    // el codigo de aeropuerto llegan ya normalizados desde el service.
    public async Task<IReadOnlyList<OpenFlightResponse>> GetByDepartureAirportAndStateAsync(
        string departureCode,
        string state,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                f.flight_id,
                f.plane_plate,
                departure_airport.airport_name,
                departure_airport.code,
                departure_airport.city,
                arrival_airport.airport_name,
                arrival_airport.code,
                arrival_airport.city,
                f.state,
                f.gate,
                f.departure_datetime,
                f.arrival_datetime,
                f.miles
            FROM tecair.flight f
            INNER JOIN tecair.airport departure_airport
                ON departure_airport.code = f.airport_departs_from_id
            INNER JOIN tecair.airport arrival_airport
                ON arrival_airport.code = f.airport_arrives_to_id
            WHERE
                f.state = @state
                AND LOWER(departure_airport.code) = LOWER(@departure_code)
            ORDER BY f.departure_datetime ASC, f.flight_id ASC;
            """;

        var flights = new List<OpenFlightResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("departure_code", departureCode);
        command.Parameters.AddWithValue("state", state);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            flights.Add(new OpenFlightResponse
            {
                FlightId = reader.GetInt32(0),
                PlanePlate = reader.GetString(1),
                DepartureAirportName = reader.GetString(2),
                DepartureCode = reader.GetString(3),
                DepartureCity = reader.GetString(4),
                ArrivalAirportName = reader.GetString(5),
                ArrivalCode = reader.GetString(6),
                ArrivalCity = reader.GetString(7),
                State = reader.GetString(8),
                Gate = reader.IsDBNull(9) ? null : reader.GetString(9),
                DepartureDatetime = reader.GetDateTime(10),
                ArrivalDatetime = reader.GetDateTime(11),
                Miles = reader.GetInt32(12)
            });
        }

        return flights;
    }

    // Busca vuelos por estado y ruta completa (origen y destino). El estado y
    // los codigos llegan ya normalizados a mayusculas desde el service.
    public async Task<IReadOnlyList<OpenFlightResponse>> SearchByRouteAndStateAsync(
        string state,
        string departureCode,
        string arrivalCode,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                f.flight_id,
                f.plane_plate,
                departure_airport.airport_name,
                departure_airport.code,
                departure_airport.city,
                arrival_airport.airport_name,
                arrival_airport.code,
                arrival_airport.city,
                f.state,
                f.gate,
                f.departure_datetime,
                f.arrival_datetime,
                f.miles
            FROM tecair.flight f
            INNER JOIN tecair.airport departure_airport
                ON departure_airport.code = f.airport_departs_from_id
            INNER JOIN tecair.airport arrival_airport
                ON arrival_airport.code = f.airport_arrives_to_id
            WHERE
                f.state = @state
                AND LOWER(departure_airport.code) = LOWER(@departure_code)
                AND LOWER(arrival_airport.code) = LOWER(@arrival_code)
            ORDER BY f.departure_datetime ASC, f.flight_id ASC;
            """;

        var flights = new List<OpenFlightResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("state", state);
        command.Parameters.AddWithValue("departure_code", departureCode);
        command.Parameters.AddWithValue("arrival_code", arrivalCode);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            flights.Add(new OpenFlightResponse
            {
                FlightId = reader.GetInt32(0),
                PlanePlate = reader.GetString(1),
                DepartureAirportName = reader.GetString(2),
                DepartureCode = reader.GetString(3),
                DepartureCity = reader.GetString(4),
                ArrivalAirportName = reader.GetString(5),
                ArrivalCode = reader.GetString(6),
                ArrivalCity = reader.GetString(7),
                State = reader.GetString(8),
                Gate = reader.IsDBNull(9) ? null : reader.GetString(9),
                DepartureDatetime = reader.GetDateTime(10),
                ArrivalDatetime = reader.GetDateTime(11),
                Miles = reader.GetInt32(12)
            });
        }

        return flights;
    }

    // Devuelve el estado de un vuelo sin traer todas sus columnas, para que el
    // service decida si la transicion solicitada es valida.
    public async Task<string?> GetStateAsync(int flightId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT state
            FROM tecair.flight
            WHERE flight_id = @flight_id;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result as string;
    }

    // Actualiza solo el estado y devuelve la fila resultante para que el service
    // pueda incluir el vuelo completo en la respuesta de la transicion.
    public async Task<FlightResponse> UpdateStateAsync(
        int flightId,
        string state,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE tecair.flight
            SET state = @state
            WHERE flight_id = @flight_id
            RETURNING
                flight_id,
                plane_plate,
                airport_departs_from_id,
                airport_arrives_to_id,
                state,
                gate,
                departure_datetime,
                arrival_datetime,
                miles;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);
        command.Parameters.AddWithValue("state", state);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("Failed to update the flight state.");
        }

        return MapFlightResponse(reader);
    }

    public async Task CloseItinerariesByFlightAsync(int flightId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE tecair.itinerary i
            SET state = 'CLOSED'
            FROM tecair.flight_in_itinerary fii
            WHERE
                fii.itinerary_id = i.itinerary_id
                AND fii.flight_id = @flight_id
                AND i.state <> 'CLOSED';
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<bool> FlightExistsAsync(int flightId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight
                WHERE flight_id = @flight_id
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Variante para actualizacion: ignora el vuelo actual para que no choque consigo mismo.
    public async Task<bool> PlaneHasOverlappingFlightExceptAsync(
        int excludedFlightId,
        string planePlate,
        DateTime departureDatetime,
        DateTime arrivalDatetime,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight
                WHERE
                    flight_id <> @excluded_flight_id
                    AND plane_plate = @plane_plate
                    AND departure_datetime < @arrival_datetime
                    AND arrival_datetime > @departure_datetime
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("excluded_flight_id", excludedFlightId);
        command.Parameters.AddWithValue("plane_plate", planePlate);
        command.Parameters.AddWithValue("departure_datetime", departureDatetime);
        command.Parameters.AddWithValue("arrival_datetime", arrivalDatetime);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Variante para actualizacion: permite conservar la misma puerta del vuelo editado.
    public async Task<bool> GateHasDepartureConflictExceptAsync(
        int excludedFlightId,
        string airportDepartsFromId,
        string gate,
        DateTime departureDatetime,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight
                WHERE
                    flight_id <> @excluded_flight_id
                    AND airport_departs_from_id = @airport_departs_from_id
                    AND LOWER(gate) = LOWER(@gate)
                    AND departure_datetime = @departure_datetime
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("excluded_flight_id", excludedFlightId);
        command.Parameters.AddWithValue("airport_departs_from_id", airportDepartsFromId);
        command.Parameters.AddWithValue("gate", gate);
        command.Parameters.AddWithValue("departure_datetime", departureDatetime);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Variante para actualizacion: valida margen de puerta sin chocar con el
    // mismo vuelo editado.
    public async Task<bool> GateHasDepartureWithinPreviousHourExceptAsync(
        int excludedFlightId,
        string airportDepartsFromId,
        string gate,
        DateTime departureDatetime,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight
                WHERE
                    flight_id <> @excluded_flight_id
                    AND airport_departs_from_id = @airport_departs_from_id
                    AND LOWER(gate) = LOWER(@gate)
                    AND departure_datetime >= @departure_datetime - INTERVAL '1 hour'
                    AND departure_datetime < @departure_datetime
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("excluded_flight_id", excludedFlightId);
        command.Parameters.AddWithValue("airport_departs_from_id", airportDepartsFromId);
        command.Parameters.AddWithValue("gate", gate);
        command.Parameters.AddWithValue("departure_datetime", departureDatetime);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Un vuelo usado por flight_in_itinerary no debe borrarse porque ya define una ruta vendible.
    public async Task<bool> FlightIsUsedInItineraryAsync(
        int flightId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight_in_itinerary
                WHERE flight_id = @flight_id
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<FlightResponse> UpdateAsync(
        int flightId,
        UpdateFlightRequest request,
        DateTime calculatedArrivalDatetime,
        int calculatedMiles,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE tecair.flight
            SET
                plane_plate = @plane_plate,
                airport_departs_from_id = @airport_departs_from_id,
                airport_arrives_to_id = @airport_arrives_to_id,
                state = @state,
                gate = @gate,
                departure_datetime = @departure_datetime,
                arrival_datetime = @arrival_datetime,
                miles = @miles
            WHERE flight_id = @flight_id
            RETURNING
                flight_id,
                plane_plate,
                airport_departs_from_id,
                airport_arrives_to_id,
                state,
                gate,
                departure_datetime,
                arrival_datetime,
                miles;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);
        command.Parameters.AddWithValue("plane_plate", request.PlanePlate);
        command.Parameters.AddWithValue("airport_departs_from_id", request.AirportDepartsFromId);
        command.Parameters.AddWithValue("airport_arrives_to_id", request.AirportArrivesToId);
        command.Parameters.AddWithValue("state", request.State);
        command.Parameters.AddWithValue("gate", (object?)request.Gate ?? DBNull.Value);
        command.Parameters.AddWithValue("departure_datetime", request.DepartureDatetime);
        command.Parameters.AddWithValue("arrival_datetime", calculatedArrivalDatetime);
        command.Parameters.AddWithValue("miles", calculatedMiles);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("Failed to update the flight.");
        }

        return MapFlightResponse(reader);
    }

    public async Task DeleteAsync(int flightId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            DELETE FROM tecair.flight
            WHERE flight_id = @flight_id;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<FlightClosingReportItinerary>> GetClosingReportItinerariesAsync(
        int flightId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                itinerary_id,
                flight_order
            FROM tecair.flight_in_itinerary
            WHERE flight_id = @flight_id
            ORDER BY itinerary_id ASC, flight_order ASC;
            """;

        var itineraries = new List<FlightClosingReportItinerary>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            itineraries.Add(new FlightClosingReportItinerary
            {
                ItineraryId = reader.GetInt32(0),
                FlightOrder = reader.GetInt32(1)
            });
        }

        return itineraries;
    }

    private async Task<IReadOnlyList<FlightClosingReportPassenger>> GetClosingReportPassengersAsync(
        int flightId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                fii.itinerary_id,
                fii.flight_order,
                r.reservation_id,
                r.state,
                p.passport_id,
                CONCAT_WS(' ', p.name, p.Lname) AS passenger_full_name,
                ci.confirmation_number,
                ci.seat_number,
                ci.plane_plate,
                COUNT(b.bag_number)::INTEGER AS baggage_count,
                COALESCE(SUM(b.weight), 0)::NUMERIC AS total_baggage_weight,
                COALESCE(STRING_AGG(DISTINCT b.color, ', ' ORDER BY b.color), '') AS baggage_colors,
                COALESCE(STRING_AGG(b.bag_number::TEXT, ', ' ORDER BY b.bag_number), '') AS bag_numbers,
                CASE
                    WHEN COUNT(b.bag_number) <= 1 THEN 0
                    WHEN COUNT(b.bag_number) = 2 THEN 50
                    ELSE 50 + ((COUNT(b.bag_number) - 2) * 75)
                END::NUMERIC AS extra_baggage_charge
            FROM tecair.flight_in_itinerary fii
            INNER JOIN tecair.reservation r
                ON r.itinerary_id = fii.itinerary_id
            INNER JOIN tecair.passenger p
                ON p.passport_id = r.passenger_id
            LEFT JOIN tecair.check_in ci
                ON ci.reservation_id = r.reservation_id
                AND ci.itinerary_flight_id = fii.itinerary_flight_id
            LEFT JOIN tecair.baggage b
                ON b.confirmation_number = ci.confirmation_number
            WHERE fii.flight_id = @flight_id
            GROUP BY
                fii.itinerary_id,
                fii.flight_order,
                r.reservation_id,
                r.state,
                p.passport_id,
                p.name,
                p.Lname,
                ci.confirmation_number,
                ci.seat_number,
                ci.plane_plate
            ORDER BY
                fii.itinerary_id ASC,
                fii.flight_order ASC,
                passenger_full_name ASC,
                r.reservation_id ASC;
            """;

        var passengers = new List<FlightClosingReportPassenger>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            passengers.Add(new FlightClosingReportPassenger
            {
                ItineraryId = reader.GetInt32(0),
                FlightOrder = reader.GetInt32(1),
                ReservationId = reader.GetInt32(2),
                ReservationState = reader.GetString(3),
                PassengerPassportId = reader.GetString(4),
                PassengerFullName = reader.GetString(5),
                ConfirmationNumber = reader.IsDBNull(6) ? null : reader.GetInt32(6),
                SeatNumber = reader.IsDBNull(7) ? null : reader.GetString(7),
                CheckInPlanePlate = reader.IsDBNull(8) ? null : reader.GetString(8),
                BaggageCount = reader.GetInt32(9),
                TotalBaggageWeight = reader.GetDecimal(10),
                BaggageColors = SplitTextList(reader.GetString(11)),
                BagNumbers = SplitIntList(reader.GetString(12)),
                ExtraBaggageCharge = reader.GetDecimal(13)
            });
        }

        return passengers;
    }

    // Convierte la fila devuelta por PostgreSQL al DTO de respuesta de vuelos.
    private static FlightResponse MapFlightResponse(NpgsqlDataReader reader)
    {
        return new FlightResponse
        {
            FlightId = reader.GetInt32(0),
            PlanePlate = reader.GetString(1),
            AirportDepartsFromId = reader.GetString(2),
            AirportArrivesToId = reader.GetString(3),
            State = reader.GetString(4),
            Gate = reader.IsDBNull(5) ? null : reader.GetString(5),
            DepartureDatetime = reader.GetDateTime(6),
            ArrivalDatetime = reader.GetDateTime(7),
            Miles = reader.GetInt32(8)
        };
    }

    private static IReadOnlyList<string> SplitTextList(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return [];
        }

        return value
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();
    }

    private static IReadOnlyList<int> SplitIntList(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return [];
        }

        return value
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(int.Parse)
            .ToList();
    }
}
