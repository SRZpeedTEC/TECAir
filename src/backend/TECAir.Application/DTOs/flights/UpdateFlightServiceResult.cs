namespace TECAir.Application.DTOs.Flights;

// Resultado del caso de uso de actualizacion de vuelo.
// Mantiene los detalles HTTP fuera de la capa de aplicacion.
public class UpdateFlightServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public FlightResponse? Flight { get; private init; }

    public static UpdateFlightServiceResult Success(FlightResponse flight)
    {
        return new UpdateFlightServiceResult
        {
            IsSuccess = true,
            Flight = flight
        };
    }

    public static UpdateFlightServiceResult ValidationError(string errorMessage)
    {
        return new UpdateFlightServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    public static UpdateFlightServiceResult NotFound(string errorMessage)
    {
        return new UpdateFlightServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static UpdateFlightServiceResult Conflict(string errorMessage)
    {
        return new UpdateFlightServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
