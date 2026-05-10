namespace TECAir.Application.DTOs.Reservations;

// Resultado de busqueda para mantener la validacion fuera del controller.
public class SearchReservationsServiceResult
{
    public bool IsSuccess { get; private init; }
    public string? ErrorMessage { get; private init; }
    public IReadOnlyList<ReservationSearchResponse> Reservations { get; private init; } =
        Array.Empty<ReservationSearchResponse>();

    public static SearchReservationsServiceResult Success(IReadOnlyList<ReservationSearchResponse> reservations)
    {
        return new SearchReservationsServiceResult
        {
            IsSuccess = true,
            Reservations = reservations
        };
    }

    public static SearchReservationsServiceResult ValidationError(string errorMessage)
    {
        return new SearchReservationsServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }
}
