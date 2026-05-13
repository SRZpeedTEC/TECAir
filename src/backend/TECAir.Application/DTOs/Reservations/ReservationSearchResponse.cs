namespace TECAir.Application.DTOs.Reservations;

// DTO de busqueda con informacion util para identificar pasajero, usuario e itinerario.
public class ReservationSearchResponse
{
    public int ReservationId { get; set; }
    public int ItineraryId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string PassengerId { get; set; } = string.Empty;
    public string PassengerName { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string? PaymentReference { get; set; }
    public string? PreferredPlanePlate { get; set; }
    public string? PreferredSeatNumber { get; set; }
}
