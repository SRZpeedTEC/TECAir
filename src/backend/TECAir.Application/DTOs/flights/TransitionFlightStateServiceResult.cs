namespace TECAir.Application.DTOs.Flights;

// Resultado del caso de uso de transicion de estado de un vuelo.
// Mantiene los detalles HTTP fuera de la capa de aplicacion.
public class TransitionFlightStateServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public FlightResponse? Flight { get; private init; }

    public static TransitionFlightStateServiceResult Success(FlightResponse flight)
    {
        return new TransitionFlightStateServiceResult
        {
            IsSuccess = true,
            Flight = flight
        };
    }

    public static TransitionFlightStateServiceResult ValidationError(string errorMessage)
    {
        return new TransitionFlightStateServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    public static TransitionFlightStateServiceResult NotFound(string errorMessage)
    {
        return new TransitionFlightStateServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static TransitionFlightStateServiceResult Conflict(string errorMessage)
    {
        return new TransitionFlightStateServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
