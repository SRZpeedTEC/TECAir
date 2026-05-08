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

    // Obtiene el encabezado y vuelos de un itinerario especifico.
    Task<ItineraryDetailsResponse?> GetByIdAsync(int itineraryId, CancellationToken cancellationToken = default);

    // Trae datos minimos de vuelos para validar una creacion de itinerario.
    Task<IReadOnlyList<ItineraryFlightValidationData>> GetFlightsForCreateAsync(
        IReadOnlyCollection<int> flightIds,
        CancellationToken cancellationToken = default);

    // Guarda el itinerario y sus vuelos asociados dentro de una misma operacion.
    Task<CreateItineraryResponse> CreateAsync(
        CreateItineraryRequest request,
        CancellationToken cancellationToken = default);
}
