namespace TECAir.Application.DTOs.Flights;

// Resultado de busqueda de vuelos con validacion de filtros.
public class FlightSearchServiceResult
{
    public bool IsSuccess { get; private init; }
    public string? ErrorMessage { get; private init; }
    public IReadOnlyList<FlightResponse> Flights { get; private init; } = [];

    public static FlightSearchServiceResult Success(IReadOnlyList<FlightResponse> flights)
    {
        return new FlightSearchServiceResult
        {
            IsSuccess = true,
            Flights = flights
        };
    }

    public static FlightSearchServiceResult ValidationError(string errorMessage)
    {
        return new FlightSearchServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }
}
