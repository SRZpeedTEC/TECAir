namespace TECAir.Application.DTOs.Itineraries;

// Este objeto comunica el resultado del servicio hacia el controller.
// Permite distinguir validaciones, faltantes y conflictos sin depender de HTTP.
public class CreateItineraryServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public CreateItineraryResponse? Itinerary { get; private init; }

    // Resultado exitoso: se devuelve el itinerario creado con sus vuelos asociados.
    public static CreateItineraryServiceResult Success(CreateItineraryResponse itinerary)
    {
        return new CreateItineraryServiceResult
        {
            IsSuccess = true,
            Itinerary = itinerary
        };
    }

    // Error de validacion que el controller traducira a 400 Bad Request.
    public static CreateItineraryServiceResult ValidationError(string errorMessage)
    {
        return new CreateItineraryServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    // Referencias inexistentes, por ejemplo vuelos que no estan registrados.
    public static CreateItineraryServiceResult NotFound(string errorMessage)
    {
        return new CreateItineraryServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    // Conflicto de negocio, como vuelos u ordenes duplicadas dentro del itinerario.
    public static CreateItineraryServiceResult Conflict(string errorMessage)
    {
        return new CreateItineraryServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
