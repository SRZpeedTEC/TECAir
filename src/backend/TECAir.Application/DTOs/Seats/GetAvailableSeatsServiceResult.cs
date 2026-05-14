namespace TECAir.Application.DTOs.Seats;

// Resultado del caso de uso para consultar asientos disponibles.
// Permite que el servicio indique si el vuelo no existe sin depender de HTTP.
public class GetAvailableSeatsServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public string? ErrorMessage { get; private init; }
    public IReadOnlyList<AvailableSeatResponse> Seats { get; private init; } = [];

    public static GetAvailableSeatsServiceResult Success(IReadOnlyList<AvailableSeatResponse> seats)
    {
        return new GetAvailableSeatsServiceResult
        {
            IsSuccess = true,
            Seats = seats
        };
    }

    public static GetAvailableSeatsServiceResult NotFound(string errorMessage)
    {
        return new GetAvailableSeatsServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }
}
