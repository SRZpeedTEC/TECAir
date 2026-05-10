namespace TECAir.Application.DTOs.Itineraries;

// Resultado del borrado de itinerario.
// Permite devolver 404 o 409 sin que el servicio dependa de ASP.NET.
public class DeleteItineraryServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }

    public static DeleteItineraryServiceResult Success()
    {
        return new DeleteItineraryServiceResult
        {
            IsSuccess = true
        };
    }

    public static DeleteItineraryServiceResult NotFound(string errorMessage)
    {
        return new DeleteItineraryServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static DeleteItineraryServiceResult Conflict(string errorMessage)
    {
        return new DeleteItineraryServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
