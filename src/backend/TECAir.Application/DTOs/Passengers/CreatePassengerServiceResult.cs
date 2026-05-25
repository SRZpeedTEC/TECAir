namespace TECAir.Application.DTOs.Passengers;

// Resultado del caso de uso de creacion de pasajero sin depender de HTTP.
public class CreatePassengerServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public PassengerResponse? Passenger { get; private init; }

    // Resultado exitoso: se devuelve el pasajero creado con el formato publico de la API.
    public static CreatePassengerServiceResult Success(PassengerResponse passenger)
    {
        return new CreatePassengerServiceResult
        {
            IsSuccess = true,
            Passenger = passenger
        };
    }

    // Datos incompletos o inconsistentes que se traducen a 400 Bad Request.
    public static CreatePassengerServiceResult ValidationError(string errorMessage)
    {
        return new CreatePassengerServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    // El pasaporte ya existe y por eso no se puede crear otro pasajero igual.
    public static CreatePassengerServiceResult Conflict(string errorMessage)
    {
        return new CreatePassengerServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
