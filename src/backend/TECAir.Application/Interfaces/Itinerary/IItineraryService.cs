using TECAir.Application.DTOs.Itineraries;

namespace TECAir.Application.Interfaces;

// Contrato de casos de uso de itinerarios que consumen los controllers.
public interface IItineraryService
{
    // Busca rutas publicas con filtros opcionales para clientes.
    Task<ItinerarySearchServiceResult> SearchAsync(
        ItinerarySearchFilters filters,
        CancellationToken cancellationToken = default);

    // Busca rutas administrativas con filtros opcionales y todos los estados.
    Task<ItinerarySearchServiceResult> SearchAdminAsync(
        ItinerarySearchFilters filters,
        CancellationToken cancellationToken = default);

    // Devuelve todos los itinerarios, en edicion o publicos, con promocion y vuelos.
    Task<IReadOnlyList<ItineraryDetailsResponse>> GetAllWithPromotionsAsync(
        CancellationToken cancellationToken = default);

    // Devuelve solo itinerarios publicos con promocion y vuelos.
    Task<IReadOnlyList<ItineraryDetailsResponse>> GetPublicWithPromotionsAsync(
        CancellationToken cancellationToken = default);

    // Devuelve el detalle de un itinerario o null si no existe.
    Task<ItineraryDetailsResponse?> GetByIdAsync(int itineraryId, CancellationToken cancellationToken = default);

    // Calcula si el itinerario puede reservar el numero solicitado de pasajeros.
    Task<ItineraryAvailabilityServiceResult> GetAvailabilityAsync(
        int itineraryId,
        int passengers,
        CancellationToken cancellationToken = default);

    // Crea un itinerario despues de validar la secuencia de vuelos.
    Task<CreateItineraryServiceResult> CreateAsync(
        CreateItineraryRequest request,
        CancellationToken cancellationToken = default);

    // Actualiza precio y reemplaza la lista ordenada de vuelos del itinerario.
    Task<UpdateItineraryServiceResult> UpdateAsync(
        int itineraryId,
        UpdateItineraryRequest request,
        CancellationToken cancellationToken = default);

    // Elimina un itinerario cuando no tiene reservaciones asociadas.
    Task<DeleteItineraryServiceResult> DeleteAsync(
        int itineraryId,
        CancellationToken cancellationToken = default);
}
