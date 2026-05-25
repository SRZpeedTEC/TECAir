namespace TECAir.Application.DTOs.Reservations;

// Resultado del caso de uso de creacion de reservaciones.
public class CreateReservationServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public ReservationResponse? Reservation { get; private init; }

    // Reservacion creada correctamente.
    public static CreateReservationServiceResult Success(ReservationResponse reservation)
    {
        return new CreateReservationServiceResult
        {
            IsSuccess = true,
            Reservation = reservation
        };
    }

    // Error de validacion que no depende de consultar la base.
    public static CreateReservationServiceResult ValidationError(string errorMessage)
    {
        return new CreateReservationServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    // Referencia inexistente: itinerario, usuario, pasajero o asiento preferido.
    public static CreateReservationServiceResult NotFound(string errorMessage)
    {
        return new CreateReservationServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    // Conflicto con datos unicos, como una referencia de pago repetida.
    public static CreateReservationServiceResult Conflict(string errorMessage)
    {
        return new CreateReservationServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
