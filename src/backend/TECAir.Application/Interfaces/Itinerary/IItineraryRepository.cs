using TECAir.Application.DTOs.Itineraries;

namespace TECAir.Application.Interfaces;

// Contrato que define las operaciones de persistencia para itinerarios.
public interface IItineraryRepository
{
    // Busca itinerarios por origen y destino ya normalizados.
    Task<IReadOnlyList<ItinerarySearchResponse>> SearchAsync(
        string originCode,
        string destinationCode,
        CancellationToken cancellationToken = default);

    // Obtiene todos los itinerarios en formato resumido.
    Task<IReadOnlyList<ItinerarySummaryResponse>> GetAllOriginDestAsync(
        CancellationToken cancellationToken = default);

    // Obtiene solo itinerarios publicos resumidos, con promocion activa opcional.
    Task<IReadOnlyList<ItineraryWithPromotionSummaryResponse>> GetPublicWithPromotionsAsync(
        string? originCode = null,
        string? destinationCode = null,
        CancellationToken cancellationToken = default);

    // Obtiene el resumen de un itinerario especifico.
    Task<ItineraryWithPromotionSummaryResponse?> GetByIdAsync(int itineraryId, CancellationToken cancellationToken = default);

    // Trae datos minimos de vuelos para validar una creacion de itinerario.
    Task<IReadOnlyList<ItineraryFlightValidationData>> GetFlightsForCreateAsync(
        IReadOnlyCollection<int> flightIds,
        CancellationToken cancellationToken = default);

    // Guarda el itinerario y sus vuelos asociados.
    Task<CreateItineraryResponse> CreateAsync(
        CreateItineraryRequest request,
        CancellationToken cancellationToken = default);

    // Verifica existencia del itinerario antes de modificarlo.
    Task<bool> ItineraryExistsAsync(int itineraryId, CancellationToken cancellationToken = default);

    // Reemplaza precio y vuelos asociados.
    Task<CreateItineraryResponse> UpdateWithFlightsAsync(
        int itineraryId,
        UpdateItineraryRequest request,
        CancellationToken cancellationToken = default);

    // Revisa si el itinerario ya fue vendido en alguna reservacion.
    Task<bool> ItineraryHasReservationsAsync(int itineraryId, CancellationToken cancellationToken = default);

    // Borra relaciones de vuelos y luego el itinerario.
    Task DeleteAsync(int itineraryId, CancellationToken cancellationToken = default);
}
