namespace TECAir.Application.DTOs.Flights;

// Este objeto permite que el servicio explique el resultado del caso de uso
// sin depender de codigos HTTP ni de clases propias del controller.
public class CreateFlightServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public FlightResponse? Flight { get; private init; }

    // Resultado exitoso: se devuelve el vuelo ya creado con los datos de la base.
    public static CreateFlightServiceResult Success(FlightResponse flight)
    {
        return new CreateFlightServiceResult
        {
            IsSuccess = true,
            Flight = flight
        };
    }

    // Error de validacion de negocio que el controller traducira a 400 Bad Request.
    public static CreateFlightServiceResult ValidationError(string errorMessage)
    {
        return new CreateFlightServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    // Referencia inexistente, por ejemplo un avion o aeropuerto que no esta registrado.
    public static CreateFlightServiceResult NotFound(string errorMessage)
    {
        return new CreateFlightServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    // Conflicto de agenda: la solicitud es valida, pero choca con otro vuelo existente.
    public static CreateFlightServiceResult Conflict(string errorMessage)
    {
        return new CreateFlightServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
