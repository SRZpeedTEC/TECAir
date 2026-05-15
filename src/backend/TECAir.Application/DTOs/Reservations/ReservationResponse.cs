namespace TECAir.Application.DTOs.Reservations;

// DTO devuelto al crear una reservacion.
public class ReservationResponse
{
    public int ReservationId { get; set; }
    public int ItineraryId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string PassengerId { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PaymentReference { get; set; } = string.Empty;
}
